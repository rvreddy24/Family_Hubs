import type { Env } from "../src/types";

/**
 * In-memory test harness: a tiny fake of Supabase PostgREST + Workers AI so the
 * real Worker (src/index.ts) runs end-to-end in a unit test with no network.
 */

interface Row {
  [k: string]: unknown;
}

export interface FakeDb {
  spaces: Row[];
  memories: Row[];
}

type Filter = { col: string; op: "eq" | "ilike"; val: string };

function parseFilters(qs: URLSearchParams): Filter[] {
  const out: Filter[] = [];
  for (const [k, v] of qs.entries()) {
    if (["select", "order", "limit"].includes(k)) continue;
    const eq = /^eq\.(.*)$/.exec(v);
    if (eq) {
      out.push({ col: k, op: "eq", val: eq[1] });
      continue;
    }
    const il = /^ilike\.(.*)$/.exec(v);
    if (il) out.push({ col: k, op: "ilike", val: il[1] });
  }
  return out;
}

function match(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    const cell = String(row[f.col] ?? "");
    if (f.op === "eq") return cell === f.val;
    // ilike: PostgREST uses * as wildcard -> case-insensitive substring.
    const needle = f.val.replace(/\*/g, "").toLowerCase();
    return cell.toLowerCase().includes(needle);
  });
}

/** Build a fetch() stand-in that emulates the exact PostgREST calls supabase.ts makes. */
export function makeFetch(db: FakeDb) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const path = url.pathname.replace(/^\/rest\/v1\//, "");
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const table = path.split("?")[0];
    const filters = parseFilters(url.searchParams);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

    // RPC: semantic search -> return this space's memories (fake similarity=1).
    if (table === "rpc/match_memories") {
      const spaceId = body.p_space_id;
      const count = body.p_match_count ?? 8;
      const rows = db.memories
        .filter((m) => m.space_id === spaceId && m.embedding != null)
        .slice(0, count)
        .map((m) => ({
          id: m.id,
          content: m.content,
          tags: m.tags,
          metadata: m.metadata,
          created_at: m.created_at,
          similarity: 1,
        }));
      return json(rows);
    }

    const store = table === "spaces" ? db.spaces : table === "memories" ? db.memories : null;
    if (!store) return json({ message: "unknown table" }, 404);

    if (method === "GET") {
      let rows = store.filter((r) => match(r, filters));
      const limit = Number(url.searchParams.get("limit") ?? 0);
      if (limit) rows = rows.slice(0, limit);
      return json(rows.map((r) => ({ ...r, embedding: undefined })));
    }

    if (method === "POST") {
      const rows = Array.isArray(body) ? body : [body];
      for (const r of rows) {
        if (table === "memories") {
          r.id ??= `mem_${db.memories.length + 1}`;
          r.created_at ??= new Date().toISOString();
        }
        store.push(r);
      }
      return json(rows, 201);
    }

    if (method === "PATCH") {
      const updated: Row[] = [];
      for (const r of store) {
        if (match(r, filters)) {
          Object.assign(r, body);
          updated.push({ ...r, embedding: undefined });
        }
      }
      return json(updated);
    }

    if (method === "DELETE") {
      const deleted: Row[] = [];
      for (let i = store.length - 1; i >= 0; i--) {
        if (match(store[i], filters)) deleted.push(store.splice(i, 1)[0]);
      }
      return json(deleted);
    }

    return json({ message: "unhandled" }, 500);
  };
}

/** A fake Env with a deterministic embedding model + Supabase pointed at makeFetch. */
export function makeEnv(): { env: Env; db: FakeDb } {
  const db: FakeDb = { spaces: [], memories: [] };
  const env: Env = {
    AI: {
      // bge-style output; dimension matches EMBED_DIM below.
      run: async () => ({ data: [new Array(8).fill(0.1)] }),
    } as unknown as Ai,
    SUPABASE_URL: "https://fake.supabase.co",
    SUPABASE_SERVICE_KEY: "service-key",
    ADMIN_SECRET: "admin-secret",
    EMBED_MODEL: "@cf/baai/bge-base-en-v1.5",
    EMBED_DIM: "8",
  };
  return { env, db };
}

/** Helper to build a JSON Request. */
export function req(
  method: string,
  path: string,
  opts: { body?: unknown; key?: string } = {},
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.key) headers.Authorization = `Bearer ${opts.key}`;
  return new Request(`https://worker.test${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}
