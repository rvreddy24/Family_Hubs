# CLAUDE.md — Recall

Guidance for any AI session working in this repo.

## What this is (read first)

This folder is `D:\Familyhubs` and the domain is **familyhubs.in**, but the
product is **NOT** a "family hub" app. The owner explicitly decoupled the product
from the domain name. The product is **Recall** — an open long-term memory layer
for AI agents. Don't reintroduce family/household framing.

Recall is a single **Cloudflare Worker** that provides durable, semantically
searchable memory to AI agents, over three surfaces:

- **MCP** — `POST /mcp` (Streamable HTTP JSON-RPC). Tools: `remember`, `recall`,
  `list_recent`, `stats`, `update`, `forget`.
- **REST** — `/remember`, `/recall`, `/recent`, `PATCH|DELETE /memories/:id`.
- **Dashboard** — `GET /app`, a self-contained web UI (no build step).

Backend: **Supabase Postgres + pgvector** for storage/search, **Cloudflare
Workers AI** (`@cf/baai/bge-base-en-v1.5`, 768-dim) for embeddings. Hard
constraint from the owner: **Cloudflare + Supabase, free tier only.**

## Architecture

```
agent ──MCP/REST──► Worker (src/index.ts router)
                      ├─ auth.ts     Bearer space-key -> space (hash lookup)
                      ├─ memory.ts   remember/recall/recent/update/forget
                      ├─ embed.ts    env.AI.run(...) -> vector
                      ├─ supabase.ts PostgREST + rpc/match_memories (service key)
                      ├─ mcp.ts      JSON-RPC handler over the same ops
                      └─ landing.ts / app.ts  HTML
```

Data model (`supabase/schema.sql`): `spaces` (per-agent tenant; API key stored as
SHA-256 hash) and `memories` (content, tags, metadata, `vector(768)` embedding).
Search is `match_memories()` RPC (cosine). RLS is ON with **no policies**, so only
the service-role key (used inside the Worker) can touch data.

## Security invariants — do not break

- The Supabase **service-role key lives only in the Worker** (`wrangler secret`).
  Never expose it to clients or the dashboard.
- Clients authenticate to the Worker with a **space API key** (`rcl_…`); only its
  hash is stored. `/spaces` creation is guarded by `ADMIN_SECRET`.
- `EMBED_DIM` (wrangler.toml) must equal the `vector(N)` dim in schema.sql. If you
  change the embedding model, change both.

## Commands

```bash
npm run dev         # wrangler dev --local (see note below)
npm test            # vitest — 14 tests, full router against an in-memory fake
npm run typecheck   # tsc --noEmit (checks src/)
npm run deploy      # wrangler deploy (needs wrangler login)
npm run deploy:auto # scripted deploy via .deploy.env (no browser login)
```

Toolchain: Wrangler v4 + `@cloudflare/workers-types` v5. Local dev uses `--local`
because Workers AI has no local simulator — without `--local`, v4 tries to open a
remote AI proxy at startup and requires `CLOUDFLARE_API_TOKEN`. Routing, landing,
and dashboard work locally; actual `AI.run` embedding calls need a token or a real
deploy.

`recall`/`remember` degrade gracefully: if embedding is unavailable (e.g. the free
Workers AI daily allocation is exhausted), memories are still stored (with a null
embedding, re-embeddable via `update`) and `recall` falls back to keyword (ILIKE)
search. See `tryEmbed` + `keywordSearch`.

Tests live in `test/` and mock Supabase + Workers AI in `test/harness.ts`, so they
run with no network and no credentials. Add a test when you add a route or tool.

## Deploy status

**Not deployed yet.** Code is complete, typechecks, tests pass, and
`wrangler deploy --dry-run` builds. Go-live is blocked only on the owner
authenticating their own Cloudflare + Supabase accounts (an AI session cannot
create accounts or enter their credentials). To finish: run `supabase/schema.sql`
in the Supabase SQL editor, set the two Worker secrets, deploy, then optionally add
`familyhubs.in` as a Worker custom domain.

## Conventions

- TypeScript, ES modules, strict mode. No framework in the Worker — a hand-rolled
  router in `src/index.ts`. Keep handlers small; put logic in `memory.ts`.
- Throw `ApiError(message, status)` for client-facing errors; the router converts
  them to JSON. CORS lives in `http.ts`.
- The dashboard (`app.ts`) and landing page (`landing.ts`) are plain HTML strings
  returned by the Worker — intentionally no bundler.
