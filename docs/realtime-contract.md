# Real-time contract (Socket.io v4 + Engine.io v4)

The Node server in [`server/socket.ts`](../server/socket.ts) and web clients in [`src/context`](../src/context) share this contract. **Android** uses the same `socket.io-client` protocol (see [`android/provider/README.md`](../android/provider/README.md)).

## Connection

- **URL:** `VITE_SOCKET_URL` (web) or `BuildConfig.SOCKET_URL` (Android). Same port as the API in dev: `http://<host>:3001`.
- **Transports:** `websocket`, `polling` (web client; Android client may use default).
- **Auth (optional):** Handshake `auth: { token: <Supabase access JWT> }`. If `STRICT_SOCKET_AUTH=1` and `SUPABASE_*` are set, `task:update` / `task:create` / `sos:trigger` require a valid user (see server [`realtimeHelpers`](../server/realtimeHelpers.ts)).
- **CORS:** Browsers use `CLIENT_URL` and optional `ALLOWED_ORIGINS` (comma-separated). Native clients often send no `Origin` header; the server allows missing origin.

## Client must emit first

| Event         | Payload |
|---------------|---------|
| `join:room`   | `{ role: "child" \| "admin" \| "provider", hubId?: string }` |

The server answers with a **full snapshot** on every join:

| Event         | Payload |
|---------------|---------|
| `state:sync`  | `{ tasks: ServiceTask[], hubs: Hub[] }` |

**Authoritative list:** when the server sends `state:sync` after `join:room`, the **Android** provider app **replaces** its local task list with `tasks` (it does not merge with stale rows). The web app already overwrites from the same event.

All clients in the same `hubId` should use the **same** hub id (e.g. `hub_mgl`) so they receive `hub:<id>`-scoped events.

## Events (server → clients)

Broadcasts are sent to the **`hub:<hubId>`** room when `hubId` is known; otherwise the server falls back to a process-wide emit.

| Event               | When |
|---------------------|------|
| `task:updated`      | After a successful `task:update` |
| `task:created`      | After `task:create` |
| `sos:broadcast`     | After `sos:trigger` |
| `sos:acknowledged`  | After `sos:acknowledge` |
| `identity:confirmed`| After `identity:verified` |
| `notification:push`  | Pushed for task/SOS/identity (see payload in `LiveSignalToaster` / `SocketContext` on web) |

## Events (client → server)

| Event            | Payload |
|------------------|---------|
| `task:update`    | `{ taskId, status, updatedBy, hubId? }` — include **`hubId`** (family admin uses current hub) |
| `task:create`    | Full `ServiceTask` (must include `childId`, `id`; set **`hubId`**) |
| `sos:trigger`    | `{ userId, hubId, parentName, location? }` |
| `sos:acknowledge`| `{ hubId, acknowledgedBy }` |
| `identity:verified` | `{ providerId, taskId, verifiedBy }` |

## Task `hubId`

[`ServiceTask`](../src/types.ts) includes optional **`hubId`**. The booking flow in the web app sets it from the user’s `hubId`. The server uses it to route real-time events to the correct `hub:` room when the socket is not the one that joined the room (edge cases).

## Android note

The provider app under `android/provider` mirrors `join:room` and listens for the same `state:sync` / `task:updated` events. Reconnect triggers `connect` then re-`join:room` (same as web) to get a fresh `state:sync`.

## Support chat (inbox + floating widget)

Implemented in [`server/socket.ts`](../server/socket.ts) and the web app (`SupportChatWidget`, admin `SupportConsole`). Threads are **hub-scoped**; family and provider each have at most one thread per hub per `kind` (`family` | `provider`).

### Client → server

| Event | Payload | Notes |
|-------|---------|--------|
| `chat:open` | `{ kind, hubId?, userId?, userName?, userEmail? }` | Creates or returns the user’s thread; joins the socket to `chat:thread:<id>`. If the thread was **`resolved`**, the same member opening again sets status back to **`open`**. |
| `chat:join` | `{ threadId }` | Hub admin or thread owner may join the thread room. |
| `chat:message` | `{ threadId, body, kind?: 'text' \| 'faq' \| 'system', authorName? }` | Owner or admin. |
| `chat:read` | `{ threadId, role?: 'admin' \| 'user' }` | Clears unread counters. |
| `chat:typing` | `{ threadId, isTyping, authorRole? }` | Ephemeral typing signal. |
| `chat:resolve` | `{ threadId }` | **Hub admin** or **thread owner** (JWT `sub` = `thread.userId`) when Supabase is enabled. Marks **`resolved`**, clears admin/user unreads, appends a system line (wording differs for admin vs member). |
| `chat:reopen` | `{ threadId }` | **Hub admin only** (with Supabase enabled). Sets status **`open`** and appends a system line. |

### Server → clients

| Event | Payload |
|-------|---------|
| `chat:list` | `{ threads }` — filtered list for the caller |
| `chat:thread:upserted` | `ChatThread` |
| `chat:history` | `{ threadId, messages }` |
| `chat:message` | `ChatMessage` |

Rooms: `chat:inbox:<hubId>` (admins), `chat:thread:<threadId>`, `user:<userId>` for thread upserts.
