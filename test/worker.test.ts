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

  it("validates input", async () => {
    const key = await newSpace();
    expect((await call(req("POST", "/remember", { key, body: {} }))).status).toBe(400);
    expect((await call(req("POST", "/recall", { key, body: {} }))).status).toBe(400);
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
      ["forget", "list_recent", "recall", "remember", "update"].sort(),
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

  it("treats notifications as 202 with no body", async () => {
    const key = await newSpace();
    const res = await call(
      req("POST", "/mcp", { key, body: { jsonrpc: "2.0", method: "notifications/initialized" } }),
    );
    expect(res.status).toBe(202);
  });
});
