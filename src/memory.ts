import type { Env, Memory, Space } from "./types";
import { ApiError } from "./http";
import { embed } from "./embed";
import {
  countMemories,
  deleteMemory,
  getMemory,
  insertMemory,
  keywordSearch,
  listRecent,
  matchMemories,
  updateMemory,
} from "./supabase";

/** Embed, returning null instead of throwing so callers can degrade gracefully. */
async function tryEmbed(env: Env, text: string): Promise<number[] | null> {
  try {
    return await embed(env, text);
  } catch (e) {
    console.warn("embedding unavailable, degrading:", (e as Error).message);
    return null;
  }
}

/** Store a new memory. Embeds the content for later semantic recall. */
export async function remember(
  env: Env,
  space: Space,
  args: {
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    ttl_seconds?: number;
  },
): Promise<Memory> {
  const content = (args.content ?? "").trim();
  if (!content) throw new ApiError("`content` is required", 400);
  if (content.length > 8000) throw new ApiError("`content` too long (max 8000 chars)", 400);

  const tags = normalizeTags(args.tags);
  const metadata = withExpiry(args.metadata ?? {}, args.ttl_seconds);
  // If embedding is unavailable (e.g. Workers AI daily limit), still store the
  // memory so nothing is lost — it stays keyword-searchable and can be
  // re-embedded later via `update`.
  const embedding = await tryEmbed(env, content);
  return insertMemory(env, {
    space_id: space.id,
    content,
    tags,
    metadata,
    embedding,
  });
}

/** Attach `_expires_at` to metadata when a positive TTL is given. */
function withExpiry(
  base: Record<string, unknown>,
  ttlSeconds?: number,
): Record<string, unknown> {
  const ttl = Number(ttlSeconds);
  if (!Number.isFinite(ttl) || ttl <= 0) return base;
  const capped = Math.min(ttl, 60 * 60 * 24 * 365); // max 1 year
  return { ...base, _expires_at: new Date(Date.now() + capped * 1000).toISOString() };
}

/** True if a memory carries an `_expires_at` in the past. */
function isExpired(m: Memory): boolean {
  const exp = (m.metadata as { _expires_at?: unknown } | undefined)?._expires_at;
  return typeof exp === "string" && new Date(exp).getTime() <= Date.now();
}

/** Drop expired memories from a result set and purge them best-effort. */
function pruneExpired(env: Env, space: Space, rows: Memory[]): Memory[] {
  const live: Memory[] = [];
  for (const m of rows) {
    if (isExpired(m)) {
      // Fire-and-forget cleanup; ignore failures.
      void deleteMemory(env, space.id, m.id).catch(() => {});
    } else {
      live.push(m);
    }
  }
  return live;
}

/** Semantic search across this space's memories. */
export async function recall(
  env: Env,
  space: Space,
  args: { query: string; limit?: number; min_similarity?: number },
): Promise<Memory[]> {
  const query = (args.query ?? "").trim();
  if (!query) throw new ApiError("`query` is required", 400);

  const limit = clamp(args.limit ?? 8, 1, 50);
  const minSimilarity = clamp(args.min_similarity ?? 0, 0, 1);
  // Semantic search when embeddings are available; otherwise fall back to a
  // keyword search so recall still returns something useful.
  const embedding = await tryEmbed(env, query);
  const rows = embedding
    ? await matchMemories(env, space.id, embedding, limit, minSimilarity)
    : await keywordSearch(env, space.id, query, limit);
  return pruneExpired(env, space, rows);
}

/** Edit an existing memory. Re-embeds when `content` changes. */
export async function update(
  env: Env,
  space: Space,
  args: {
    id: string;
    content?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<Memory> {
  const id = (args.id ?? "").trim();
  if (!id) throw new ApiError("`id` is required", 400);
  if (
    args.content === undefined &&
    args.tags === undefined &&
    args.metadata === undefined
  ) {
    throw new ApiError("Provide at least one of `content`, `tags`, `metadata`", 400);
  }

  const patch: {
    content?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    embedding?: number[];
  } = {};

  if (args.content !== undefined) {
    const content = args.content.trim();
    if (!content) throw new ApiError("`content` cannot be empty", 400);
    if (content.length > 8000) throw new ApiError("`content` too long (max 8000 chars)", 400);
    patch.content = content;
    const embedding = await tryEmbed(env, content);
    if (embedding) patch.embedding = embedding;
  }
  if (args.tags !== undefined) patch.tags = normalizeTags(args.tags);
  if (args.metadata !== undefined) patch.metadata = args.metadata;

  const updated = await updateMemory(env, space.id, id, patch);
  if (!updated) throw new ApiError("No memory found with that id", 404);
  return updated;
}

/** Most recently stored memories, newest first. Optionally filtered by tag. */
export async function recent(
  env: Env,
  space: Space,
  args: { limit?: number; tag?: string },
): Promise<Memory[]> {
  const tag = typeof args.tag === "string" ? args.tag.trim().toLowerCase() : undefined;
  const rows = await listRecent(env, space.id, clamp(args.limit ?? 10, 1, 50), tag || undefined);
  return pruneExpired(env, space, rows);
}

/**
 * Retrieval-augmented answer: recall relevant memories, then have the text model
 * synthesize an answer grounded in them.
 */
export async function ask(
  env: Env,
  space: Space,
  args: { question: string; limit?: number },
): Promise<{ answer: string; sources: Memory[] }> {
  const question = (args.question ?? "").trim();
  if (!question) throw new ApiError("`question` is required", 400);

  const sources = await recall(env, space, {
    query: question,
    limit: clamp(args.limit ?? 6, 1, 20),
  });
  if (sources.length === 0) {
    return { answer: "I don't have any memories relevant to that yet.", sources: [] };
  }

  const context = sources.map((m, i) => `[${i + 1}] ${m.content}`).join("\n");
  const prompt =
    `Answer the question using ONLY the memories below. If they don't contain the ` +
    `answer, say you don't know. Cite the memories you use like [1].\n\n` +
    `Memories:\n${context}\n\nQuestion: ${question}`;

  try {
    const out = (await env.AI.run(env.CHAT_MODEL as keyof AiModels, {
      messages: [
        { role: "system", content: "You are a concise assistant answering from stored memories." },
        { role: "user", content: prompt },
      ],
      max_tokens: 512,
    } as never)) as { response?: string };
    const answer = (out?.response ?? "").trim();
    return { answer: answer || "(No answer produced.)", sources };
  } catch (e) {
    console.error("ask/chat failed [model=" + env.CHAT_MODEL + "]:", (e as Error).message);
    return {
      answer: "(Could not synthesize an answer right now — here are the relevant memories.)",
      sources,
    };
  }
}

/** Export every memory in a space (no embeddings). */
export async function exportAll(env: Env, space: Space): Promise<Memory[]> {
  const rows = await listRecent(env, space.id, 1000);
  return pruneExpired(env, space, rows);
}

/** Bulk-insert memories (each is embedded). Caps the batch size. */
export async function importMany(
  env: Env,
  space: Space,
  items: Array<{ content: string; tags?: string[]; metadata?: Record<string, unknown> }>,
): Promise<{ imported: number; skipped: number }> {
  if (!Array.isArray(items)) throw new ApiError("`memories` must be an array", 400);
  const batch = items.slice(0, 100);
  let imported = 0;
  let skipped = 0;
  for (const item of batch) {
    const content = (item?.content ?? "").toString().trim();
    if (!content || content.length > 8000) {
      skipped++;
      continue;
    }
    const embedding = await tryEmbed(env, content);
    await insertMemory(env, {
      space_id: space.id,
      content,
      tags: normalizeTags(item.tags),
      metadata: item.metadata ?? {},
      embedding,
    });
    imported++;
  }
  return { imported, skipped };
}

/** Fetch a single memory by id (scoped to the space), or null if missing/expired. */
export async function getById(env: Env, space: Space, id: string): Promise<Memory | null> {
  const m = await getMemory(env, space.id, id.trim());
  if (!m) return null;
  if (isExpired(m)) {
    void deleteMemory(env, space.id, m.id).catch(() => {});
    return null;
  }
  return m;
}

/** Simple stats for a space. */
export async function stats(
  env: Env,
  space: Space,
): Promise<{ space_id: string; name: string; memory_count: number }> {
  return {
    space_id: space.id,
    name: space.name,
    memory_count: await countMemories(env, space.id),
  };
}

/** Delete a memory by id (scoped to this space). */
export async function forget(
  env: Env,
  space: Space,
  args: { id: string },
): Promise<{ deleted: boolean }> {
  const id = (args.id ?? "").trim();
  if (!id) throw new ApiError("`id` is required", 400);
  const deleted = await deleteMemory(env, space.id, id);
  return { deleted };
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(
      tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ].slice(0, 20);
}

function clamp(n: number, lo: number, hi: number): number {
  n = Number(n);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
