# FamilyHubs.in

Full-stack care coordination for NRI families: **Vite + React** (port **3000**) and **Express + Socket.io** (port **3001**). The browser proxies `/api`, `/socket.io`, and `/health` to the API server in development.

## Quick start (development)

1. `npm install`
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_*` and, for server persistence, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (see below).
3. In Supabase **SQL Editor**, run the migration in `supabase/migrations/` so `fh_app_state` and `fh_identity_verifications` exist.
4. Start the stack:
   - **One terminal:** `npm run dev:all` — Vite (**:3000**) + API/Socket (**:3001**), or
   - **Two terminals:** `npm run dev` and `npm run server:dev`

On startup, if Supabase env vars are set, the server **hydrates** from `fh_app_state` and then **syncs** the in-memory snapshot back to that table (creates the `main` row on first run).

Without the API process, the UI still loads but **tasks/hubs** stay empty until `GET /api/state` and socket `state:sync` can run.

## Layout

| Path | Role |
|------|------|
| [server/index.ts](server/index.ts) | Express, rate limiting, `/api`, `/health`, production static `dist` |
| [server/socket.ts](server/socket.ts) | Socket.io handlers (source of truth for tasks/hubs in memory) |
| [server/store.ts](server/store.ts) | Shared in-memory state seeded from [src/data/initialState.ts](src/data/initialState.ts) |
| [server/persistence.ts](server/persistence.ts) | Optional Supabase snapshot (`fh_app_state` table) |
| [src/context/AppContext.tsx](src/context/AppContext.tsx) | UI state; hydrates from `/api/state` + `state:sync` |
| [src/context/SocketContext.tsx](src/context/SocketContext.tsx) | Socket client; passes Supabase JWT when configured |
| [src/components/provider/ProviderApp.tsx](src/components/provider/ProviderApp.tsx) | Field-ops UI; tasks from global context (provider filter) |
| [android/provider](android/provider/README.md) | **Native Android** provider app (Kotlin + Compose + Socket.io) |
| [docs/realtime-contract.md](docs/realtime-contract.md) | Real-time event contract (web + server + Android) |

## Android provider app

The service provider can use a **native app** in `android/provider/` (see [android/provider/README.md](android/provider/README.md)). It uses the same `join:room` + `state:sync` flow as the web client. For development, point `socketUrl` in `local.properties` at the machine running the API (`10.0.2.2` = host from the Android emulator). Use `ALLOWED_ORIGINS` in `.env` if you load the **web** UI from a phone on your LAN.

## Socket event names (server)

Client `socket.on` / `socket.emit` pairs used in this repo include:

- `join:room` — server responds with `state:sync` (`tasks`, `hubs`)
- `task:update` / `task:updated` / `task:create` / `task:created`
- `sos:trigger` / `sos:broadcast` / `sos:acknowledge` / `sos:acknowledged`
- `identity:verified` / `identity:confirmed`
- `notification:push`

## Environment

See [.env.example](.env.example). Notable:

- `VITE_SOCKET_URL` — socket server URL (production: your API host)
- `CLIENT_URL` — allowed CORS origin for the browser app
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — enable DB snapshot for tasks/hubs (see `supabase/migrations/`)
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — optional browser auth
- `STRICT_SOCKET_AUTH=1` — reject socket connections with invalid JWT when Supabase is enabled

## Production

- `npm run build` then `NODE_ENV=production npm start` serves `dist` from the same Node process.
- Or host static `dist` on a CDN and run only the API + Socket process; set `VITE_SOCKET_URL` to the API origin at build time.

[Dockerfile](Dockerfile) is provided for a single-container layout.

## Tests

- `npm run test:server` — provider task mutation rules ([server/realtimeHelpers.test.ts](server/realtimeHelpers.test.ts))

## More documentation

- [docs/VERIFICATION_CHECKLIST.md](docs/VERIFICATION_CHECKLIST.md) — three-client manual checks
- [docs/FCM.md](docs/FCM.md) — optional background push
- [PROJECT_REPORT.md](PROJECT_REPORT.md) — status, roadmap, and gap analysis
