# FamilyHubs.in — Project status and roadmap

## Current implementation (alpha)

- **Front end:** React 19, Vite, Tailwind 4, Motion, Recharts, Sonner toasts.
- **Back end:** Express on `PORT` (default 3001), Socket.io, optional Supabase persistence for a JSON snapshot table `fh_app_state`.
- **State model:** [server/store.ts](server/store.ts) is the process-wide source of truth; clients load `GET /api/state` and receive `state:sync` on `join:room`.
- **Three UIs:** NRI child, hub admin (Identity Guard + SafeHub), field provider (ProviderApp) — all read shared task/hub state from [AppContext](src/context/AppContext.tsx).
- **Auth:** Local demo login by email (admin / provider / child). Optional Supabase email/password when `VITE_SUPABASE_*` is set; JWT is passed on the socket when present.
- **Identity Guard:** Real camera preview via `getUserMedia` and canvas snapshot; ID upload from file input.
- **Escrow / WhatsApp:** Stub routes under `/api/payments` and `/api/comms` for future Razorpay/Stripe and template providers.

## Roadmap (beta → production)

1. **Normalized database** — replace JSON snapshot with relational tasks, users, audit logs, and RLS per role.
2. **Mandatory auth** — remove demo path; enforce policies and `STRICT_SOCKET_AUTH` in production.
3. **Object storage** — store ID/face captures in private buckets with signed URLs and audit entries in `fh_identity_verifications` (or successor tables).
4. **Payments** — hold/release escrow with webhooks and reconciliation.
5. **Operations** — queue workers for WhatsApp/SMS, rate limits tuned per region, Sentry/metrics.

## Ports and processes

| Process | Port | Command |
|--------|------|--------|
| Vite | 3000 | `npm run dev` |
| API + Socket | 3001 | `npm run server:dev` or `npm start` (after `npm run build`) |
