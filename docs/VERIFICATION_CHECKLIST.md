# Manual verification checklist (family web, admin web, provider Android)

Run `npm run dev:all` so the API (Socket) is on **:3001** and the web app on **:3000**. Android: set `local.properties` `socketUrl` to `http://10.0.2.2:3001` (emulator) and `defaultHubId` to the same value as the web (e.g. `hub_mgl`).

1. **Same hub**  
   All clients use the same `hubId` in `join:room` (web from user / Android from Connection card).  
   **Pass:** Android shows `state:sync` task count; web dashboard loads tasks from the same process.

2. **Assigned task**  
   Create a task in the family portal with `providerId` equal to the Android provider’s user id (or use admin to assign in your workflow).  
   **Pass:** task appears in Android **Dashboard** / **Active** when `providerId` matches `manual user id` or Supabase `user.id`.

3. **Status update from Android**  
   On **Active job**, advance steps (or verify code for `arrived` as on web).  
   **Pass:** family and admin UIs see the new status within a second; server logs `task:update`.

4. **SOS**  
   Family triggers SOS.  
   **Pass:** admin **Alerts** shows the broadcast; optional: Android `last event` line shows `SOS: …` when connected to the same hub.

5. **SOS acknowledge**  
   Admin acknowledges.  
   **Pass:** `emergencyAlerts` clears; Android receives `sos:acknowledged` if in the hub room (check last event or hub card).

6. **Reconnect**  
   Force-stop the Android app and reopen, or background then foreground. With **Connect live** already used, the app can auto-reconnect on resume; or tap **Connect live** again.  
   **Pass:** `state:sync` repopulates tasks; the list **replaces** the local snapshot (no stuck deleted tasks from an old merge).

7. **STRICT auth**  
   Set `STRICT_SOCKET_AUTH=1` and valid Supabase in `.env` / server. Sign in on Android, connect with token.  
   **Pass:** `task:update` works. Remove or invalidate token — mutations should be rejected (server log); use **Sign in** again.

Automated: `npm run test:server` (provider vs other user task mutation rules).
