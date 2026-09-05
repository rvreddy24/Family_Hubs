import type { Env } from "./types";
import { ApiError, CORS_HEADERS, errorJson, json } from "./http";
import { landingPage } from "./landing";
import { dashboardPage } from "./app";
import { handleMcp } from "./mcp";
import {
  authenticate,
  generateApiKey,
  generateSpaceId,
  sha256hex,
} from "./auth";
import { createSpace } from "./supabase";
import { forget, recall, recent, remember, update } from "./memory";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // --- Public ---------------------------------------------------------
      if (path === "/" && request.method === "GET") {
        return new Response(landingPage(url.origin), {
          headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
        });
      }
      if (path === "/app" && request.method === "GET") {
        return new Response(dashboardPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS },
        });
      }
      if (path === "/health" && request.method === "GET") {
        return json({ ok: true, service: "recall", time: new Date().toISOString() });
      }

      // --- Space creation (admin secret) ----------------------------------
      if (path === "/spaces" && request.method === "POST") {
        return await createSpaceRoute(request, env);
      }

      // --- MCP endpoint (space key) ---------------------------------------
      if (path === "/mcp" && request.method === "POST") {
        const space = await authenticate(request, env);
        return await handleMcp(request, env, space);
      }

      // --- REST memory API (space key) ------------------------------------
      if (path === "/remember" && request.method === "POST") {
        const space = await authenticate(request, env);
        const args = await readJson(request);
        return json(await remember(env, space, args as never), 201);
      }
      if (path === "/recall" && request.method === "POST") {
        const space = await authenticate(request, env);
        const args = await readJson(request);
        return json({ results: await recall(env, space, args as never) });
      }
      if (path === "/recent" && request.method === "GET") {
        const space = await authenticate(request, env);
        const limit = Number(url.searchParams.get("limit") ?? 10);
        return json({ results: await recent(env, space, { limit }) });
      }
      if (path.startsWith("/memories/") && request.method === "PATCH") {
        const space = await authenticate(request, env);
        const id = decodeURIComponent(path.slice("/memories/".length));
        const args = await readJson(request);
        return json(await update(env, space, { ...args, id } as never));
      }
      if (path.startsWith("/memories/") && request.method === "DELETE") {
        const space = await authenticate(request, env);
        const id = decodeURIComponent(path.slice("/memories/".length));
        return json(await forget(env, space, { id }));
      }

      return errorJson(`Not found: ${request.method} ${path}`, 404);
    } catch (e) {
      if (e instanceof ApiError) return errorJson(e.message, e.status);
      console.error("Unhandled error:", e);
      return errorJson(`Internal error: ${(e as Error).message}`, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
    throw new ApiError("Request body must be a JSON object", 400);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Invalid JSON body", 400);
  }
}

async function createSpaceRoute(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("Authorization") ?? "";
  const provided = /^Bearer\s+(.+)$/i.exec(auth.trim())?.[1]?.trim();
  if (!env.ADMIN_SECRET) throw new ApiError("Server missing ADMIN_SECRET", 500);
  if (provided !== env.ADMIN_SECRET) throw new ApiError("Admin authorization required", 401);

  const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" ? body.name.slice(0, 80) : "";

  const apiKey = generateApiKey();
  const space = await createSpace(env, {
    id: generateSpaceId(),
    name,
    api_key_hash: await sha256hex(apiKey),
  });

  // The raw key is returned exactly once and never stored in plaintext.
  return json(
    {
      space_id: space.id,
      name: space.name,
      api_key: apiKey,
      note: "Store this api_key now — it is shown only once.",
    },
    201,
  );
}
