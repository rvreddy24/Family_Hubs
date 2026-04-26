# FamilyHubs.in

Full-stack care coordination: **Vite + React** web app, **Express + Socket.io** realtime API, **Supabase** (Auth + optional Postgres snapshot), and an optional **Android** provider app. Marketing landings and authenticated `/app` routes serve families, partners (providers), and hub admins.

---

## Project structure

```
Family_Hubs/
├── index.html                 # Vite HTML shell
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc             # Cloudflare Worker: static `dist/` + proxy `/api/*` → API origin
├── worker/
│   └── index.js               # Worker: forwards /api to Render; ASSETS for SPA
├── Dockerfile                 # Optional single-container (API can serve `dist` if built)
│
├── src/                       # React (Vite) frontend
│   ├── main.tsx               # Router: /, /providers, /hubs, /app/*
│   ├── App.tsx                # Role-based shell: family UI, ProviderApp, AdminDashboard
│   ├── types.ts
│   ├── index.css
│   ├── constants.ts
│   ├── data/
│   │   └── initialState.ts   # Dev seed reference (server store is source of truth when API runs)
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── context/
│   │   ├── AuthContext.tsx   # Supabase session + sign-in/out
│   │   ├── AppContext.tsx   # Tasks, hubs, parents, notes, wallet, chat — REST + socket
│   │   └── SocketContext.tsx # socket.io-client + JWT
│   ├── pages/
│   │   ├── FamilyLanding.tsx
│   │   ├── ProviderLanding.tsx
│   │   └── HubAdminLanding.tsx
│   └── components/
│       ├── admin/            # e.g. IdentityGuardModal
│       ├── marketing/         # MarketingNav
│       ├── provider/         # ProviderApp (field-ops)
│       ├── support/          # SupportChatWidget (FAQ + live chat)
│       └── ui/               # LiveSignalToaster, etc.
│
├── server/                    # Node API + Socket.io (TypeScript, run via `tsx`)
│   ├── index.ts              # Express, CORS, `/api`, `/health`, optional static `dist`
│   ├── demoConfig.ts         # Demo email/password constants (not in SQL)
│   ├── demoProvision.ts     # On startup: Supabase Auth + in-memory parent/provider/wallet
│   ├── socket.ts             # All realtime handlers (tasks, SOS, chat, …)
│   ├── socketAuth.ts         # Supabase JWT on socket handshake
│   ├── store.ts              # In-memory state (tasks, hubs, parents, providers, notes, wallets, chat)
│   ├── persistence.ts       # Optional hydrate/persist to Supabase `fh_app_state`
│   ├── realtimeHelpers.ts   # Auth helpers for socket handlers
│   ├── realtimeHelpers.test.ts
│   └── routes/
│       ├── api.ts            # Public/sanitized REST, wallet rules
│       ├── admin.ts         # Admin-only (manifest, parents, wallet audit)
│       ├── providers.ts     # Provider list, apply, …
│       ├── payments.ts      # Escrow stubs (Razorpay/Stripe later)
│       └── comms.ts
│
├── supabase/
│   └── migrations/
│       └── 20260426120000_fh_app_state.sql   # `fh_app_state` + identity table if used
│
├── android/
│   └── provider/              # Native Kotlin + Compose provider app
│       ├── README.md
│       └── app/src/main/java/in/familyhubs/provider/…
│
├── scripts/                   # TS CLI smoke / maintenance (run with `npx tsx`)
│   ├── seed-demo-accounts.ts
│   ├── reset-state.ts
│   ├── cleanup-test-users.ts
│   ├── smoke-full-audit.ts
│   ├── smoke-deep-audit.ts
│   ├── smoke-chat.ts
│   ├── smoke-security.ts
│   └── smoke-provider-apply.ts
│
└── docs/
    └── realtime-contract.md
```

---

## Architecture (high level)

| Layer | Technology |
|--------|------------|
| **Browser UI** | React 19, Vite, Tailwind, React Router, Socket.io client, Supabase JS |
| **Realtime + REST** | Express, Socket.io, in-memory store + optional Supabase snapshot |
| **Auth** | Supabase Auth; roles in `app_metadata` (server-trusted) |
| **DB (optional)** | Supabase Postgres — `fh_app_state` JSON snapshot for durability |
| **Production static** | Often **Cloudflare Worker** + `dist/`; API on **Render** (or any Node host) |
| **Mobile** | Android provider app talks to same API + Supabase Auth |

---

## Quick start (development)

1. **`npm install`**
2. Copy **`.env.example`** → **`.env`** and set at least:
   - **`VITE_SUPABASE_URL`**, **`VITE_SUPABASE_ANON_KEY`** (browser)
   - Optional persistence: **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**
3. In Supabase **SQL Editor**, run **`supabase/migrations/`** so `fh_app_state` (and related) exist.
4. Start the stack:
   - **`npm run dev:all`** — Vite **:3000** + API **:3001**, or
   - Two terminals: **`npm run dev`** and **`npm run server:dev`**

Vite dev server proxies `/api` and socket traffic to the API; see `vite.config.ts`.

---

## Scripts (package.json)

| Command | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run server:dev` | API + Socket.io with watch |
| `npm run dev:all` | Both |
| `npm run build` | Production build → `dist/` |
| `npm start` | Run `server/index.ts` (set `NODE_ENV=production` if serving `dist` from same process) |
| `npm run lint` | `tsc --noEmit` |
| `npm run test:server` | `server/realtimeHelpers.test.ts` |

---

## Environment

See **`.env.example`**. Common variables:

- **`VITE_SOCKET_URL`** — Socket/API origin in production builds (e.g. `https://your-api.onrender.com`)
- **`CLIENT_URL`** / **`ALLOWED_ORIGINS`** — CORS for the web app
- **`SUPABASE_*`** / **`VITE_SUPABASE_*`** — Auth and optional DB snapshot
- **`STRICT_SOCKET_AUTH=1`** — Reject anonymous sockets when Supabase is configured
- **`DEMO_AUTO_PROVISION`** — `0` to disable. Default: on when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set.
- **`DEMO_PROVISION_HUB_ADMIN`** — `1` to create/update `admin.demo@` (hub console + smoke tests). In **production** the default is **off** (only **family** + **provider** demos are provisioned). Set to `1` on the API host if you need the admin demo there.

### Demo accounts (not SQL)

There are **no** demo users in SQL migrations. With a service role key, the **API process** creates/updates:

- **Family:** `family.demo@familyhubs.in` (child)
- **Provider:** `provider.demo@familyhubs.in`

**Hub admin** (`admin.demo@familyhubs.in`) is only created when `DEMO_PROVISION_HUB_ADMIN=1` or when `NODE_ENV !== 'production'`. Passwords and names live in **`server/demoConfig.ts`**.

In-memory data (parent profile, provider row, opening wallet) is idempotently applied in **`server/demoProvision.ts`** after the DB snapshot loads.

Optional CLI to refresh **Auth** only: `npx tsx scripts/seed-demo-accounts.ts` (restart the API to rely on the same in-memory rules, or let persistence rehydrate).

### Support chat (family / provider / admin)

- **Family & provider** (floating widget): **End chat** ends the thread (double-tap to confirm). Opening help again **reopens** the same thread for a new conversation when it was resolved.
- **Hub admin** (Support tab): **Mark resolved** closes the ticket; **Reopen thread** sets it back to open so you can reply again.

Socket details: `docs/realtime-contract.md` (support chat section).

---

## Quality checks (smoke tests)

With `.env` populated and a running **or** production API, point **`VITE_API_URL`** and **`VITE_SOCKET_URL`** at the API (e.g. `https://family-hubs.onrender.com`):

- `npx tsx scripts/smoke-full-audit.ts`
- `npx tsx scripts/smoke-deep-audit.ts`
- `npx tsx scripts/smoke-chat.ts`
- `npx tsx scripts/smoke-security.ts`
- `npx tsx scripts/smoke-provider-apply.ts` (may hit email/IP rate limits)

`scripts/seed-demo-accounts.ts` — optional; syncs the same Supabase Auth users as the server (service role). Prefer relying on **API startup** `demoProvision` instead.

---

## Production (typical)

- **Frontend:** `npm run build` → deploy **`dist/`**; many setups use **Cloudflare** (`wrangler.jsonc` + `worker/`) to serve assets and **proxy `/api/*`** to the API host.
- **Backend:** **`npm start`** (or **Dockerfile**) on a host with WebSocket support (e.g. **Render**).
- **Payments:** Stubs in `server/routes/payments.ts`; no live payment gateway in tree.

---

## Documentation

- **`docs/realtime-contract.md`** — Socket/REST contract
- **`android/provider/README.md`** — Android provider app

---

## License / status

Private project; **1.0.0-alpha** in `package.json`.
