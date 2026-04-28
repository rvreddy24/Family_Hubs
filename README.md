# FamilyHubs.in

**FamilyHubs** is a full‑stack care coordination product: a React web app (marketing + authenticated app), a realtime Node API (REST + Socket.io), and Supabase for Auth (and optional Postgres persistence). It’s built around three user experiences:

- **Families**: request help, track tasks, communicate with support, and manage a lightweight wallet/ledger.
- **Providers (partners)**: apply, receive/handle tasks, and coordinate in realtime.
- **Hub admins**: oversee operations, identity/eligibility checks, and support threads.

## What’s in this repo

- **Web app**: Vite + React + Tailwind, with role-based routes under `/app`.
- **Realtime API**: Express + Socket.io, with an in-memory store for fast iteration.
- **Supabase**:
  - **Auth**: sessions in browser; server-trusted roles in `app_metadata`.
  - **Optional durability**: a Postgres “snapshot” table (`fh_app_state`) to persist/rehydrate app state.
- **Optional Android provider app**: Kotlin + Compose client for field-ops.

---

## General workflow (how the product is meant to be used)

### 1) Marketing → sign in → app shell

- Visitors land on:
  - `/` (family)
  - `/providers` (provider landing)
  - `/hubs` (hub admin landing)
- After sign-in, the authenticated experience lives under **`/app/*`**.
- On app load, clients connect to Socket.io and emit **`join:room`**, then the server replies with an authoritative **`state:sync`** snapshot (see `docs/realtime-contract.md`).

### 2) Family flow (request care → track progress)

- **Book/request help**: family creates a task (Socket **`task:create`**).
- **Fund/escrow (current model)**: task costs can lock escrow against the family wallet (in-memory ledger); when the task is settled the escrow is released.
- **Track status live**: task changes come over Socket **`task:updated`** and the UI stays in sync without refresh.
- **SOS**: family can trigger SOS; the hub receives a live broadcast and can acknowledge.
- **Support chat**: family opens the floating widget, sends messages, and can resolve/end a thread.

### 3) Hub admin flow (operate the hub)

- **Inbox + operations view**: admins join the hub room and see the latest state snapshot.
- **Assign provider**: admins dispatch verified providers to tasks (Socket **`task:assign`**).
- **Provider verification**:
  - Providers can submit docs/self-declared info in-app.
  - Admins can download a provider “application manifest” via REST (`/api/admin/providers/:id/manifest`).
- **Support console**: admins see hub-scoped threads, can mark resolved, and can reopen threads.
- **Audits**: admins can inspect hub-scoped parent directory and wallet/transaction snapshots (server-gated).

### 4) Provider flow (accept job → complete steps)

- Providers sign in and join their hub room (web or Android).
- They receive the current task list via **`state:sync`** and live updates via **`task:updated`**.
- On an active job they advance steps by emitting **`task:update`** (web + Android are aligned on the same contract).

---

## Feature status (working vs stubs / TODOs)

- **Working now**
  - **Auth + roles** via Supabase (role in `app_metadata`)
  - **Realtime state sync** (Socket.io `join:room` → `state:sync`)
  - **Tasks**: create, update status, hub broadcast updates
  - **Provider dispatch**: admin assigns providers to tasks (verified-only)
  - **Support chat**: hub-scoped threads + inbox + resolve/reopen behavior
  - **Wallet/ledger (in-memory)**: wallet snapshot + escrow lock/release on task settle
  - **Optional state durability**: snapshot persistence to Supabase Postgres (`fh_app_state`)

- **Stubs / not fully implemented yet**
  - **Payments gateway**: escrow hold endpoint is a stub (`server/routes/payments.ts`)
  - **Outbound comms (WhatsApp/SMS)**: SOS relay endpoint is a stub (`server/routes/comms.ts`)
  - **Mobile push notifications**: device registration endpoint exists but is not implemented (`POST /api/push/device`)

---

## Happy-path verification checklist (manual)

Use this to sanity-check “is the product working end-to-end?” on a fresh machine.

### Setup

- Copy `.env.example` → `.env`
- Configure Supabase **browser keys**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- For demo provisioning + admin tools, configure server-side keys: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Run `supabase/migrations/*` in the Supabase SQL editor (enables `fh_app_state` if you want durability)
- Start everything:

```bash
npm run dev:all
```

### 1) Family: sign in and create a task

- Open `http://localhost:3000/`
- Sign in as the **family demo** user (`family.demo@familyhubs.in`)
- Confirm the app connects (you should see live state populate shortly after load)
- Create a new booking/request (creates a task via Socket `task:create`)
- Confirm the task appears immediately in the task list

### 2) Admin: see the task and assign a provider

- Open `http://localhost:3000/hubs`
- Sign in as **admin demo** (`admin.demo@familyhubs.in`)
  - If it doesn’t exist in production-like environments, set `DEMO_PROVISION_HUB_ADMIN=1` on the API and restart it.
- Confirm you can see the hub’s live tasks (from `state:sync` and subsequent realtime updates)
- Assign a provider to the task (Socket `task:assign`)

### 3) Provider: receive assignment and update statuses

- Open `http://localhost:3000/providers` (or use the Android app in `android/provider`)
- Sign in as the **provider demo** user (`provider.demo@familyhubs.in`)
- Confirm the provider sees the assigned job
- Advance the job state (Socket `task:update`) and verify:
  - family view updates live
  - admin view updates live

### 4) Wallet/escrow sanity

- If the task has a non-zero `cost`, confirm escrow bookkeeping happens:
  - escrow is locked when the task is created (if enabled by the flow)
  - escrow is released when status moves to `settled`
- (Optional) verify wallet via REST tooling endpoint:
  - `GET /api/wallet/:userId` (requires Supabase + bearer token)

### 5) Support chat

- As family, open the floating support widget and send a message
- As admin, confirm the thread appears in the support console, reply, and mark resolved
- As family, re-open help and confirm the thread resumes/reopens as expected

### 6) SOS

- As family, trigger SOS
- As admin, confirm the SOS broadcast is received and acknowledge it

### 7) Provider verification artifact (manifest)

- As admin, download a provider manifest:
  - `GET /api/admin/providers/:id/manifest` (text)
  - `GET /api/admin/providers/:id/manifest.json` (json)

## Quick start (development)

1. Install deps:

```bash
npm install
```

2. Configure env:
   - Copy `.env.example` → `.env`
   - Set at least **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**
   - For optional persistence / demo provisioning set **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`**

3. (Optional but recommended) Create persistence tables in Supabase:
   - Run SQL from `supabase/migrations/` in the Supabase SQL editor (creates `fh_app_state` and related tables).

4. Start web + API:

```bash
npm run dev:all
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

The Vite dev server proxies `/api` and Socket.io traffic to the API (see `vite.config.ts`).

---

## Common commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | Web app (Vite) |
| `npm run server:dev` | API + Socket.io (watch mode) |
| `npm run dev:all` | Web + API together |
| `npm run build` | Production build to `dist/` |
| `npm start` | Run API (`server/index.ts`) |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm run test:server` | Server tests |

---

## Environment notes

See `.env.example`. A few important variables:

- **`VITE_SOCKET_URL`**: production API origin for REST + sockets (example: `https://your-api.onrender.com`)
- **`CLIENT_URL`** / **`ALLOWED_ORIGINS`**: CORS allowlist for the API
- **`STRICT_SOCKET_AUTH=1`**: reject anonymous socket connections when Supabase is configured
- **`DEMO_AUTO_PROVISION`**: set `0` to disable demo provisioning
- **`DEMO_PROVISION_HUB_ADMIN`**: `1` to provision the admin demo user (see below)

### Demo accounts (not SQL)

There are **no** demo users in SQL migrations. When the API has a service role key, startup provisioning creates/updates Supabase Auth users and seeds in-memory domain state:

- **Family**: `family.demo@familyhubs.in`
- **Provider**: `provider.demo@familyhubs.in`

**Hub admin** (`admin.demo@familyhubs.in`) is provisioned only when:

- `DEMO_PROVISION_HUB_ADMIN=1`, or
- `NODE_ENV !== 'production'`

Passwords and names live in `server/demoConfig.ts`. The idempotent provisioning logic is in `server/demoProvision.ts`.

Optional CLI to refresh Auth-only users:

```bash
npx tsx scripts/seed-demo-accounts.ts
```

### Support chat behavior

- **Family/provider widget**: “End chat” resolves the thread; opening help later reopens the same thread for a new conversation.
- **Hub admin console**: “Mark resolved” closes a ticket; “Reopen thread” sets it back to open.

Contract details: `docs/realtime-contract.md`.

---

## Quality checks (smoke tests)

With `.env` populated and a running local **or** production API, set `VITE_API_URL` and `VITE_SOCKET_URL` to that API (example: `https://family-hubs.onrender.com`), then run:

```bash
npx tsx scripts/smoke-full-audit.ts
npx tsx scripts/smoke-deep-audit.ts
npx tsx scripts/smoke-chat.ts
npx tsx scripts/smoke-security.ts
npx tsx scripts/smoke-provider-apply.ts
```

---

## Production (typical)

- **Frontend**: `npm run build` → deploy `dist/`
  - Common setup: Cloudflare Worker serves assets and proxies `/api/*` to the API origin (`wrangler.jsonc`, `worker/`).
- **Backend**: run `npm start` (or `Dockerfile`) on a WebSocket-friendly host (example: Render).
- **Payments**: stubs exist in `server/routes/payments.ts` (no live gateway configured here).

---

## Architecture (high level)

| Layer | Technology |
|--------|------------|
| **Browser UI** | React 19, Vite, Tailwind, React Router, Socket.io client, Supabase JS |
| **Realtime + REST** | Express, Socket.io, in-memory store + optional Supabase snapshot |
| **Auth** | Supabase Auth; roles in `app_metadata` (server-trusted) |
| **DB (optional)** | Supabase Postgres — `fh_app_state` JSON snapshot for durability |
| **Static hosting** | Cloudflare Worker + `dist/` (common) |
| **Mobile** | Android provider app (optional) |

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
│   │   ├── AppContext.tsx    # Tasks, hubs, parents, notes, wallet, chat — REST + socket
│   │   └── SocketContext.tsx # socket.io-client + JWT
│   ├── pages/
│   │   ├── FamilyLanding.tsx
│   │   ├── ProviderLanding.tsx
│   │   └── HubAdminLanding.tsx
│   └── components/
│       ├── admin/            # e.g. IdentityGuardModal
│       ├── marketing/        # MarketingNav
│       ├── provider/         # ProviderApp (field-ops)
│       ├── support/          # SupportChatWidget (FAQ + live chat)
│       └── ui/               # LiveSignalToaster, etc.
│
├── server/                    # Node API + Socket.io (TypeScript, run via `tsx`)
│   ├── index.ts               # Express, CORS, `/api`, `/health`, optional static `dist`
│   ├── demoConfig.ts          # Demo email/password constants (not in SQL)
│   ├── demoProvision.ts       # On startup: Supabase Auth + in-memory parent/provider/wallet
│   ├── socket.ts              # All realtime handlers (tasks, SOS, chat, …)
│   ├── socketAuth.ts          # Supabase JWT on socket handshake
│   ├── store.ts               # In-memory state (tasks, hubs, parents, providers, notes, wallets, chat)
│   ├── persistence.ts         # Optional hydrate/persist to Supabase `fh_app_state`
│   ├── realtimeHelpers.ts     # Auth helpers for socket handlers
│   ├── realtimeHelpers.test.ts
│   └── routes/
│       ├── api.ts             # Public/sanitized REST, wallet rules
│       ├── admin.ts           # Admin-only (manifest, parents, wallet audit)
│       ├── providers.ts       # Provider list, apply, …
│       ├── payments.ts        # Escrow stubs (Razorpay/Stripe later)
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

## Documentation

- `docs/realtime-contract.md` — Socket/REST contract
- `android/provider/README.md` — Android provider app

---

## License / status

Private project; **1.0.0-alpha** in `package.json`.
