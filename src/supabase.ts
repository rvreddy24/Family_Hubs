import type { Env, Memory, Space } from "./types";
import { ApiError } from "./http";

/** Low-level Supabase REST (PostgREST) call using the service-role key. */
async function sb(
  env: Env,
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  return res;
}

async function ok<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Supabase ${context} failed (${res.status}): ${body}`, 502);
  }
  return (await res.json()) as T;
}

// --- Spaces -----------------------------------------------------------------

export async function findSpaceByKeyHash(env: Env, keyHash: string): Promise<Space | null> {
  const res = await sb(
    env,
    `spaces?api_key_hash=eq.${encodeURIComponent(keyHash)}&select=id,name,created_at&limit=1`,
  );
  const rows = await ok<Space[]>(res, "space lookup");
  return rows[0] ?? null;
}

export async function createSpace(
  env: Env,
  space: { id: string; name: string; api_key_hash: string },
): Promise<Space> {
  const res = await sb(env, "spaces", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(space),
  });
  const rows = await ok<Space[]>(res, "space create");
  return rows[0];
}

// --- Memories ---------------------------------------------------------------

export async function insertMemory(
  env: Env,
  row: {
    space_id: string;
    content: string;
    tags: string[];
    metadata: Record<string, unknown>;
    embedding: number[] | null;
  },
): Promise<Memory> {
  const res = await sb(env, "memories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  const rows = await ok<Memory[]>(res, "memory insert");
  return stripEmbedding(rows[0]);
}

export async function updateMemory(
  env: Env,
  spaceId: string,
  id: string,
  patch: {
    content?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    embedding?: number[];
  },
): Promise<Memory | null> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  if (patch.embedding !== undefined) row.embedding = patch.embedding;

  const res = await sb(
    env,
    `memories?space_id=eq.${encodeURIComponent(spaceId)}&id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  );
  const rows = await ok<Memory[]>(res, "update memory");
  return rows[0] ? stripEmbedding(rows[0]) : null;
}

export async function listRecent(env: Env, spaceId: string, limit: number): Promise<Memory[]> {
  const res = await sb(
    env,
    `memories?space_id=eq.${encodeURIComponent(spaceId)}` +
      `&select=id,content,tags,metadata,created_at` +
      `&order=created_at.desc&limit=${limit}`,
  );
  return ok<Memory[]>(res, "list recent");
}

export async function deleteMemory(env: Env, spaceId: string, id: string): Promise<boolean> {
  const res = await sb(
    env,
    `memories?space_id=eq.${encodeURIComponent(spaceId)}&id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } },
  );
  const rows = await ok<Memory[]>(res, "delete memory");
  return rows.length > 0;
}

export async function matchMemories(
  env: Env,
  spaceId: string,
  embedding: number[],
  count: number,
  minSimilarity: number,
): Promise<Memory[]> {
  const res = await sb(env, "rpc/match_memories", {
    method: "POST",
    body: JSON.stringify({
      p_space_id: spaceId,
      p_query_embedding: embedding,
      p_match_count: count,
      p_min_similarity: minSimilarity,
    }),
  });
  return ok<Memory[]>(res, "match memories");
}

function stripEmbedding(m: Memory & { embedding?: unknown }): Memory {
  const { embedding: _drop, ...rest } = m;
  return rest;
}
