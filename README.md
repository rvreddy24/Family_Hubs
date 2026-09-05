# Recall — long-term memory for AI agents

> Give any AI agent durable, semantically-searchable memory. Store facts in one
> session, recall them in the next. Runs entirely on free tiers.

Recall is a single [Cloudflare Worker](https://developers.cloudflare.com/workers/)
that speaks two protocols over the same backend:

- **MCP** (`POST /mcp`, Streamable HTTP) — connect it to Claude or any MCP client
  and the agent gains six tools: `remember`, `recall`, `list_recent`, `stats`,
  `update`, `forget`.
- **REST** (`/remember`, `/recall`, `/recent`, `/memories/:id`) — for scripts and
  non-MCP agents.
- **Dashboard** (`/app`) — a built-in web UI to search, add, edit, and delete a
  space's memories. No separate deploy; it ships inside the same Worker.

MCP clients can also **browse memories as resources** (`resources/list` /
`resources/read`, uri `recall://memory/<id>`). Memories can be given a **TTL**
(`ttl_seconds` on `remember`) to auto-expire. Public endpoints are **rate-limited**
per space (and per IP for space creation) via Cloudflare's rate-limiting binding.

Memories are embedded with **Cloudflare Workers AI** and stored in **Supabase
Postgres + pgvector**, so `recall` is real semantic search, not keyword matching.

```
 AI agent ──MCP / REST──► Cloudflare Worker ──► Workers AI (embeddings)
                                │
                                └──────────────► Supabase (pgvector search)
```

## Why this exists

The biggest limitation of today's agents is that they forget everything between
sessions. Recall is a small, self-hostable memory layer that fixes that without
any paid service: Cloudflare's free plan (100k requests/day, a daily Workers AI
allocation) and Supabase's free Postgres are enough to run it for real.

## Data model & privacy

- Every memory belongs to a **space** (one per agent/app). Spaces are isolated —
  a space can only ever see its own memories.
- Clients authenticate to the Worker with a **space API key** (`Bearer rcl_…`).
  Only the SHA-256 hash of the key is stored; the raw key is shown once.
- The Supabase **service-role key lives only inside the Worker** and is never
  exposed to clients. Row Level Security is enabled with no policies, so the
  public anon key can read nothing.

---

## Setup

### 1. Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), run it.
   (It enables `pgvector`, creates the tables + the `match_memories` search function.)
3. Copy from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (secret)

### 2. Configure the Worker

Edit [`wrangler.toml`](wrangler.toml) and set `SUPABASE_URL` to your project URL.

> The embedding model is `@cf/baai/bge-base-en-v1.5` → **768 dims**. If you swap
> models, update both `EMBED_DIM` in `wrangler.toml` and `vector(768)` in the schema.

### 3. Install & run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the two secrets
npm run dev                      # http://localhost:8787
```

`.dev.vars` holds `SUPABASE_SERVICE_KEY` and `ADMIN_SECRET` for local dev.

### 4. Deploy

**Interactive (browser login):**

```bash
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put ADMIN_SECRET        # a long random string you choose
npm run deploy
```

**Or fully automated (no browser login)** — put a Cloudflare API token +
credentials in `.deploy.env` (see `.deploy.env.example`) and run:

```bash
npm run deploy:auto
```

This writes `SUPABASE_URL` into `wrangler.toml`, pushes both secrets, and deploys.

Either way you'll get a `https://recall.<your-subdomain>.workers.dev` URL.

Then mint your first space in one command:

```bash
npm run create-space -- https://recall.<sub>.workers.dev YOUR_ADMIN_SECRET my-agent
```

### 5. (Optional) Serve it from familyhubs.in

If the domain is on Cloudflare: **Workers & Pages → recall → Settings → Domains &
Routes → Add Custom Domain →** `familyhubs.in` (or `api.familyhubs.in`). Cloudflare
provisions the DNS record and TLS automatically.

---

## Usage

### Create a memory space (once per agent)

```bash
curl -X POST https://YOUR-WORKER/spaces \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{"name":"my-agent"}'
# -> { "space_id": "sp_…", "api_key": "rcl_…", ... }   (save the api_key!)
```

### Connect over MCP

Add a custom connector / entry to your MCP client config:

```json
{
  "mcpServers": {
    "recall": {
      "url": "https://YOUR-WORKER/mcp",
      "headers": { "Authorization": "Bearer rcl_YOUR_SPACE_KEY" }
    }
  }
}
```

The agent now has `remember`, `recall`, `list_recent`, and `forget`.

### Or hit the REST API

```bash
# store
curl -X POST https://YOUR-WORKER/remember \
  -H "Authorization: Bearer rcl_YOUR_SPACE_KEY" \
  -d '{"content":"We chose Postgres over Mongo for strong consistency","tags":["decision"]}'

# semantic recall
curl -X POST https://YOUR-WORKER/recall \
  -H "Authorization: Bearer rcl_YOUR_SPACE_KEY" \
  -d '{"query":"which database did we pick and why?","limit":5}'

# recent + delete
curl https://YOUR-WORKER/recent -H "Authorization: Bearer rcl_YOUR_SPACE_KEY"
curl -X DELETE https://YOUR-WORKER/memories/THE_ID -H "Authorization: Bearer rcl_YOUR_SPACE_KEY"
```

## API reference

| Method | Path             | Auth          | Body / notes                                             |
| ------ | ---------------- | ------------- | ------------------------------------------------------- |
| GET    | `/`              | —             | Landing page                                            |
| GET    | `/app`           | —             | Web dashboard (asks for a space key client-side)        |
| GET    | `/health`        | —             | Liveness                                                |
| POST   | `/spaces`        | admin secret  | `{ name? }` → returns `api_key` once                    |
| POST   | `/mcp`           | space key     | MCP Streamable HTTP (JSON-RPC)                          |
| POST   | `/remember`      | space key     | `{ content, tags?, metadata?, ttl_seconds? }`           |
| POST   | `/recall`        | space key     | `{ query, limit?, min_similarity? }`                    |
| GET    | `/recent`        | space key     | `?limit=` and optional `?tag=`                          |
| GET    | `/stats`         | space key     | `{ space_id, name, memory_count }`                      |
| PATCH  | `/memories/:id`  | space key     | `{ content?, tags?, metadata? }` (re-embeds on content) |
| DELETE | `/memories/:id`  | space key     | Delete one memory                                       |

## Project layout

```
src/
  index.ts     HTTP router (REST + MCP + spaces + landing + dashboard)
  mcp.ts       MCP JSON-RPC (Streamable HTTP) handler
  tools.ts     MCP tool schemas + dispatch
  memory.ts    remember / recall / recent / update / forget
  embed.ts     Workers AI embeddings
  supabase.ts  Supabase REST + match_memories RPC
  auth.ts      API key generation + space authentication
  http.ts      JSON/CORS/error helpers
  landing.ts   HTML landing page
  app.ts       web dashboard (served at /app)
  types.ts     Env + shared types
scripts/
  deploy.mjs        automated Cloudflare deploy (npm run deploy:auto)
  create-space.mjs  mint a space + print its key (npm run create-space)
test/                 vitest suite (mocks Supabase + Workers AI, no network)
supabase/schema.sql   database schema (run in Supabase)
wrangler.toml         Worker config + AI binding
CLAUDE.md             context for AI sessions working in this repo
```

## Development

```bash
npm test          # 17 tests: full router end-to-end against an in-memory fake
npm run typecheck # tsc --noEmit
npm run dev       # wrangler dev --local
```

Tests mock Supabase and Workers AI (`test/harness.ts`), so they need no
credentials or network. CI (`.github/workflows/ci.yml`) runs typecheck + tests +
a dry-run build on every push. **CD** (`.github/workflows/deploy.yml`) deploys to
Cloudflare on every push to `main` once tests pass — it needs two repo secrets,
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Notes & limits

- **Free-tier headroom:** Workers 100k req/day; Workers AI has a daily neuron
  allocation (plenty for typical agent memory traffic); Supabase free Postgres.
- **Graceful degradation:** if embedding is unavailable (e.g. the Workers AI daily
  allocation is exhausted), memories are still stored (with a null embedding, which
  `update` can backfill) and `recall` falls back to keyword (ILIKE) search — so the
  service keeps working instead of erroring.
- **Embedding dim** must match between `wrangler.toml` and the schema.
- Recall is stateless per request; there are no background jobs to keep running.
