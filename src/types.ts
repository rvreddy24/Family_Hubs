/// <reference types="@cloudflare/workers-types" />

/** Cloudflare rate-limiting binding (unsafe/beta). */
export interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Workers AI binding (embeddings). */
  AI: Ai;
  /** Per-space API rate limiter. Optional so tests/local dev work without it. */
  RL_API?: RateLimiter;
  /** Per-IP limiter guarding space creation. */
  RL_SPACES?: RateLimiter;
  /** Supabase project URL, e.g. https://abc.supabase.co */
  SUPABASE_URL: string;
  /** Supabase service-role key. Secret. Server-side only. */
  SUPABASE_SERVICE_KEY: string;
  /** Shared secret guarding space creation (POST /spaces). Secret. */
  ADMIN_SECRET: string;
  /** Embedding model id. */
  EMBED_MODEL: string;
  /** Embedding dimension as a string (must match schema.sql). */
  EMBED_DIM: string;
}

export interface Space {
  id: string;
  name: string;
  created_at: string;
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  /** Present on recall results. */
  similarity?: number;
}
