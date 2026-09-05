import type { Env, Memory, Space } from "./types";
import { ApiError } from "./http";
import { embed } from "./embed";
import {
  deleteMemory,
  insertMemory,
  listRecent,
  matchMemories,
  updateMemory,
} from "./supabase";

/** Store a new memory. Embeds the content for later semantic recall. */
export async function remember(
  env: Env,
  space: Space,
  args: { content: string; tags?: string[]; metadata?: Record<string, unknown> },
): Promise<Memory> {
  const content = (args.content ?? "").trim();
  if (!content) throw new ApiError("`content` is required", 400);
  if (content.length > 8000) throw new ApiError("`content` too long (max 8000 chars)", 400);

  const tags = normalizeTags(args.tags);
  const embedding = await embed(env, content);
  return insertMemory(env, {
    space_id: space.id,
    content,
    tags,
    metadata: args.metadata ?? {},
    embedding,
  });
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
  const embedding = await embed(env, query);
  return matchMemories(env, space.id, embedding, limit, minSimilarity);
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
    patch.embedding = await embed(env, content);
  }
  if (args.tags !== undefined) patch.tags = normalizeTags(args.tags);
  if (args.metadata !== undefined) patch.metadata = args.metadata;

  const updated = await updateMemory(env, space.id, id, patch);
  if (!updated) throw new ApiError("No memory found with that id", 404);
  return updated;
}

/** Most recently stored memories, newest first. */
export async function recent(
  env: Env,
  space: Space,
  args: { limit?: number },
): Promise<Memory[]> {
  return listRecent(env, space.id, clamp(args.limit ?? 10, 1, 50));
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
