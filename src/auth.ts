import type { Env, Space } from "./types";
import { ApiError } from "./http";
import { findSpaceByKeyHash } from "./supabase";

/** SHA-256 hex of a string (WebCrypto, available in Workers). */
export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a fresh, URL-safe API key: `rcl_<43 base64url chars>`. */
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `rcl_${b64}`;
}

/** Generate a short, human-friendly space id. */
export function generateSpaceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sp_${hex}`;
}

function bearer(request: Request): string | null {
  const h = request.headers.get("Authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/** Resolve the caller's space from the Authorization: Bearer <api key> header. */
export async function authenticate(request: Request, env: Env): Promise<Space> {
  const key = bearer(request);
  if (!key) throw new ApiError("Missing 'Authorization: Bearer <api key>' header", 401);
  const space = await findSpaceByKeyHash(env, await sha256hex(key));
  if (!space) throw new ApiError("Invalid API key", 401);
  return space;
}
