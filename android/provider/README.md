# FamilyHubs — Service Provider (Android)

Native **Kotlin + Jetpack Compose** app that connects to the same **Socket.io** server as the web family portal and admin UI.

## Prereqs

- [Android Studio](https://developer.android.com/studio) (Hedgehog+)
- JDK 17
- Node server running from repo root: `npm run server:dev` (port **3001** by default)

## Configuration

1. Copy `local.properties.example` to `local.properties` in this folder.
2. Set `sdk.dir` to your Android SDK (Android Studio usually creates this automatically when you open the project).
3. Set `socketUrl`:
   - **Emulator → host machine API:** `http://10.0.2.2:3001`
   - **Physical device on same Wi‑Fi:** `http://<your-PC-LAN-IP>:3001` and add that origin to `ALLOWED_ORIGINS` in the server `.env` if you open the **web** app from the phone.
4. `defaultHubId` must match the **hub id** used by the web app (e.g. `hub_mgl`).
5. Optional: set `supabaseUrl` and `supabaseAnonKey` (same values as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) for in-app **Sign in**; the access token is passed to the socket when `STRICT_SOCKET_AUTH=1`.

## Build

Open the `android/provider` directory in Android Studio, sync Gradle, then **Run** on an emulator or device.

If the Gradle wrapper is missing, use **File → New → Import** or run Android Studio’s “Create wrapper” / use the IDE’s embedded Gradle to generate `gradlew`.

## Supabase

Email/password sign-in uses the same Auth REST endpoint as the web app. After sign-in, the access token is attached to the Socket handshake. Set **Provider user id** to your auth user’s UUID (automatic after sign-in) or a manual id (e.g. `provider`) to match `task.providerId` on tasks.

## What’s in the app

- **Connection** card: hub id, manual provider id, Supabase sign-in / out, **Connect live** (Socket + `join:room`); **offline banner** if you were connected and the socket drops; **foreground** can auto-retry when “live” is still on
- **`state:sync`:** task list is **replaced** from the server (authoritative)
- **Bottom navigation:** Dashboard, Active job, Earnings, History, Profile (aligned with [ProviderApp.tsx](../../src/components/provider/ProviderApp.tsx))
- **Active job:** step bar, instructions, safety code for `arrived`, advance action / `task:update`
- Earnings and history from **settled** tasks in `state:sync` / live events

Background push (FCM) is not bundled; see [../../docs/FCM.md](../../docs/FCM.md) and the optional `POST /api/push/device` stub in the server.
