# Optional: Firebase Cloud Messaging (background alerts)

When the provider app is not in the foreground, **Socket.io** may be suspended. For reliable “new assignment” or “SOS” delivery, add **FCM** on a follow-up.

## Outline

1. **Firebase** — Create a project, add an Android app with package `in.familyhubs.provider`, download `google-services.json` into `android/provider/app/` (not committed; use CI secrets in production).
2. **Dependencies** — `com.google.firebase:firebase-bom` + `firebase-messaging-ktx` in `android/provider/app/build.gradle.kts`.
3. **Service** — Implement `FirebaseMessagingService` to handle incoming data messages; show a system notification; optional deep link into **Active job**.
4. **Token registration** — On token refresh, `POST` the FCM device token to your API (e.g. `POST /api/devices` with `userId`, `hubId`, `token`, `platform=android`) stored in **Supabase** or your database.
5. **Server trigger** — On `task:created` (provider assigned) or `sos:trigger`, after `hubBroadcast`, enqueue a job that sends an FCM multicast to tokens for that `hubId` and role `provider` (or specific `providerId`).

## Stub

A minimal HTTP contract can live beside existing routes, e.g. `POST /api/push/notify` (internal/cron) that accepts a server secret header and a payload; implementation can use the Firebase Admin SDK (Node) or a Supabase Edge Function. This repository does not ship FCM or Admin SDK wiring to avoid extra secrets in the monorepo by default.

## Testing

- Foreground: rely on the existing **Socket** stack (`npm run test:server`, manual checklist in [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)).  
- Background: after FCM is integrated, use “swipe app away” and send a test notification from the Firebase console or your server route.
