import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import { makeEnv, makeFetch, req, type FakeDb } from "./harness";
import type { Env } from "../src/types";

let env: Env;
let db: FakeDb;

async function call(request: Request): Promise<Response> {
  return worker.fetch(request, env, {} as ExecutionContext);
}

/** Create a space and return its api key. */
async function newSpace(): Promise<string> {
  const res = await call(req("POST", "/spaces", { key: "admin-secret", body: { name: "t" } }));
  const body = (await res.json()) as { api_key: string };
  return body.api_key;
}

beforeEach(() => {
  const made = makeEnv();
  env = made.env;
  db = made.db;
  globalThis.fetch = makeFetch(db) as typeof fetch;
});

describe("public routes", () => {
  it("serves health", async () => {
    const res = await call(req("GET", "/health"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("serves the landing page and dashboard", async () => {
    expect((await call(req("GET", "/"))).status).toBe(200);
    const app = await call(req("GET", "/app"));
    expect(app.status).toBe(200);
    expect(await app.text()).toContain("Recall");
  });

  it("404s unknown routes", async () => {
    expect((await call(req("GET", "/nope"))).status).toBe(404);
  });
});

describe("spaces", () => {
  it("rejects creation without the admin secret", async () => {
    const res = await call(req("POST", "/spaces", { key: "wrong", body: {} }));
    expect(res.status).toBe(401);
  });

  it("creates a space and returns a one-time key", async () => {
    const res = await call(req("POST", "/spaces", { key: "admin-secret", body: { name: "a" } }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { space_id: string; api_key: string };
    expect(body.space_id).toMatch(/^sp_/);
    expect(body.api_key).toMatch(/^rcl_/);
    expect(db.spaces).toHaveLength(1);
    // Raw key is never stored — only its hash.
    expect(JSON.stringify(db.spaces[0])).not.toContain(body.api_key);
  });
});

describe("auth", () => {
  it("rejects memory ops without a key", async () => {
    expect((await call(req("POST", "/remember", { body: { content: "x" } }))).status).toBe(401);
  });
  it("rejects an invalid key", async () => {
    const res = await call(req("POST", "/remember", { key: "rcl_bogus", body: { content: "x" } }));
    expect(res.status).toBe(401);
  });
});

describe("memory lifecycle", () => {
  it("remembers, recalls, lists, updates, and forgets", async () => {
    const key = await newSpace();

    // remember
    const created = await call(
      req("POST", "/remember", { key, body: { content: "Postgres was chosen", tags: ["Decision"] } }),
    );
    expect(created.status).toBe(201);
    const mem = (await created.json()) as { id: string; tags: string[] };
    expect(mem.id).toBeTruthy();
    expect(mem.tags).toEqual(["decision"]); // normalized to lowercase

    // recall (semantic, mocked to return the space's memories)
    const recalled = await call(req("POST", "/recall", { key, body: { query: "which db?" } }));
    const rc = (await recalled.json()) as { results: Array<{ content: string; similarity: number }> };
    expect(rc.results[0].content).toBe("Postgres was chosen");
    expect(rc.results[0].similarity).toBe(1);

    // recent
    const recent = await call(req("GET", "/recent?limit=5", { key }));
    expect(((await recent.json()) as { results: unknown[] }).results).toHaveLength(1);

    // update (re-embeds)
    const patched = await call(
      req("PATCH", `/memories/${mem.id}`, { key, body: { content: "Postgres for consistency" } }),
    );
    expect(((await patched.json()) as { content: string }).content).toBe("Postgres for consistency");

    // forget
    const del = await call(req("DELETE", `/memories/${mem.id}`, { key }));
    expect(((await del.json()) as { deleted: boolean }).deleted).toBe(true);
    expect(db.memories).toHaveLength(0);
  });

  it("reports stats and filters recent by tag", async () => {
    const key = await newSpace();
    await call(req("POST", "/remember", { key, body: { content: "alpha note", tags: ["work"] } }));
    await call(req("POST", "/remember", { key, body: { content: "beta note", tags: ["home"] } }));
    await call(req("POST", "/remember", { key, body: { content: "gamma note", tags: ["work"] } }));

    const s = await call(req("GET", "/stats", { key }));
    expect(((await s.json()) as { memory_count: number }).memory_count).toBe(3);

    const work = await call(req("GET", "/recent?tag=work", { key }));
    const wr = (await work.json()) as { results: Array<{ content: string }> };
    expect(wr.results).toHaveLength(2);
    expect(wr.results.every((m) => m.content.includes("note"))).toBe(true);

    const home = await call(req("GET", "/recent?tag=home", { key }));
    expect(((await home.json()) as { results: unknown[] }).results).toHaveLength(1);
  });

  it("answers questions from memory (RAG /ask)", async () => {
    const key = await newSpace();
    await call(req("POST", "/remember", { key, body: { content: "The wifi password is hunter2" } }));
    const res = await call(req("POST", "/ask", { key, body: { question: "what is the wifi password?" } }));
    const body = (await res.json()) as { answer: string; sources: unknown[] };
    expect(body.answer).toContain("Synthesized answer");
    expect(body.sources.length).toBeGreaterThan(0);
  });

  it("exports and imports memories", async () => {
    const key = await newSpace();
    const imp = await call(
      req("POST", "/import", {
        key,
        body: { memories: [{ content: "imported one", tags: ["seed"] }, { content: "imported two" }] },
      }),
    );
    expect(((await imp.json()) as { imported: number }).imported).toBe(2);

    const exp = await call(req("GET", "/export", { key }));
    const ex = (await exp.json()) as { count: number; memories: Array<{ content: string }> };
    expect(ex.count).toBe(2);
    expect(ex.memories.map((m) => m.content).sort()).toEqual(["imported one", "imported two"]);
  });

  it("validates input", async () => {
    const key = await newSpace();
    expect((await call(req("POST", "/remember", { key, body: {} }))).status).toBe(400);
    expect((await call(req("POST", "/recall", { key, body: {} }))).status).toBe(400);
  });

  it("degrades to keyword search when embeddings are unavailable", async () => {
    const key = await newSpace();
    // Simulate the Workers AI daily allocation being exhausted.
    env.AI = { run: async () => { throw new Error("AI limit reached"); } } as unknown as Env["AI"];

    // remember still succeeds — memory stored with a null embedding, not lost.
    const created = await call(
      req("POST", "/remember", { key, body: { content: "the deploy runbook lives in notion" } }),
    );
    expect(created.status).toBe(201);
    expect(db.memories[0].embedding).toBeNull();

    // recall falls back to keyword ILIKE and still finds it.
    const recalled = await call(req("POST", "/recall", { key, body: { query: "runbook" } }));
    const rc = (await recalled.json()) as { results: Array<{ content: string }> };
    expect(rc.results).toHaveLength(1);
    expect(rc.results[0].content).toContain("runbook");
  });

  it("excludes expired memories from reads", async () => {
    const key = await newSpace();
    await call(req("POST", "/remember", { key, body: { content: "fresh" } }));
    const r = await call(req("POST", "/remember", { key, body: { content: "temporary", ttl_seconds: 60 } }));
    const mem = (await r.json()) as { id: string };
    // Force it expired directly in the fake db.
    const row = db.memories.find((m) => m.id === mem.id)!;
    row.metadata = { _expires_at: new Date(Date.now() - 1000).toISOString() };

    const rec = await call(req("GET", "/recent", { key }));
    const results = ((await rec.json()) as { results: Array<{ content: string }> }).results;
    expect(results.map((m) => m.content)).toEqual(["fresh"]);
  });

  it("returns 429 when the rate limiter denies", async () => {
    const key = await newSpace();
    env.RL_API = { limit: async () => ({ success: false }) };
    const res = await call(req("GET", "/recent", { key }));
    expect(res.status).toBe(429);
  });

  it("isolates memories between spaces", async () => {
    const a = await newSpace();
    const b = await newSpace();
    await call(req("POST", "/remember", { key: a, body: { content: "secret of A" } }));
    const bRecent = await call(req("GET", "/recent", { key: b }));
    expect(((await bRecent.json()) as { results: unknown[] }).results).toHaveLength(0);
  });
});

describe("MCP", () => {
  it("initializes, lists tools, and calls a tool", async () => {
    const key = await newSpace();

    const init = await call(
      req("POST", "/mcp", { key, body: { jsonrpc: "2.0", id: 1, method: "initialize" } }),
    );
    const initBody = (await init.json()) as { result: { serverInfo: { name: string } } };
    expect(initBody.result.serverInfo.name).toBe("recall");

    const list = await call(
      req("POST", "/mcp", { key, body: { jsonrpc: "2.0", id: 2, method: "tools/list" } }),
    );
    const tools = (await list.json()) as { result: { tools: Array<{ name: string }> } };
    expect(tools.result.tools.map((t) => t.name).sort()).toEqual(
      ["ask", "forget", "list_recent", "recall", "remember", "stats", "update"].sort(),
    );

    const callRes = await call(
      req("POST", "/mcp", {
        key,
        body: {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "remember", arguments: { content: "via mcp" } },
        },
      }),
    );
    const cr = (await callRes.json()) as { result: { isError: boolean } };
    expect(cr.result.isError).toBe(false);
    expect(db.memories).toHaveLength(1);
  });

  it("exposes memories as resources", async () => {
    const key = await newSpace();
    const r = await call(req("POST", "/remember", { key, body: { content: "resource me", tags: ["x"] } }));
    const mem = (await r.json()) as { id: string };

    const list = await call(
      req("POST", "/mcp", { key, body: { jsonrpc: "2.0", id: 1, method: "resources/list" } }),
    );
    const resources = (await list.json() as { result: { resources: Array<{ uri: string }> } }).result.resources;
    expect(resources[0].uri).toBe(`recall://memory/${mem.id}`);

    const read = await call(
      req("POST", "/mcp", {
        key,
        body: { jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: `recall://memory/${mem.id}` } },
      }),
    );
    const contents = (await read.json() as { result: { contents: Array<{ text: string }> } }).result.contents;
    expect(contents[0].text).toBe("resource me");
  });

  it("treats notifications as 202 with no body", async () => {
    const key = await newSpace();
    const res = await call(
      req("POST", "/mcp", { key, body: { jsonrpc: "2.0", method: "notifications/initialized" } }),
    );
    expect(res.status).toBe(202);
  });
});
