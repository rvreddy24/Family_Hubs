import type { Env } from "./types";
import { ApiError } from "./http";

/**
 * Embed text with Cloudflare Workers AI (free daily allocation).
 * bge-* models return { shape: [n, dim], data: number[][] }.
 */
export async function embed(env: Env, text: string): Promise<number[]> {
  const input = text.slice(0, 4000); // keep well under model limits
  let out: { data?: number[][] };
  try {
    out = (await env.AI.run(env.EMBED_MODEL as keyof AiModels, {
      text: [input],
    } as never)) as { data?: number[][] };
  } catch (e) {
    throw new ApiError(`Embedding failed: ${(e as Error).message}`, 502);
  }

  const vector = out?.data?.[0];
  if (!vector || vector.length === 0) {
    throw new ApiError("Embedding model returned no vector", 502);
  }

  const expected = Number(env.EMBED_DIM);
  if (Number.isFinite(expected) && expected > 0 && vector.length !== expected) {
    throw new ApiError(
      `Embedding dim mismatch: model gave ${vector.length}, schema expects ${expected}. ` +
        `Update EMBED_DIM + supabase/schema.sql to match.`,
      500,
    );
  }
  return vector;
}
