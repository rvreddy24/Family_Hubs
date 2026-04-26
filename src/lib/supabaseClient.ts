import { createClient } from '@supabase/supabase-js';

/** Project URL only — not .../rest/v1/ (we strip that if pasted by mistake). */
function normalizeProjectUrl(u: string): string {
  return u
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const url = rawUrl ? normalizeProjectUrl(rawUrl) : undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Browser Supabase client (use only when VITE env vars are set).
 */
export const supabase = url && anon ? createClient(url, anon) : null;

export function isSupabaseConfigured() {
  return supabase != null;
}
