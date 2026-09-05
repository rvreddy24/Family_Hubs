-- Recall — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query).
-- Free tier includes pgvector; no paid add-ons required.

-- Extensions -----------------------------------------------------------------
create extension if not exists vector;     -- pgvector: embeddings + similarity
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- Spaces ---------------------------------------------------------------------
-- One "space" per agent/app. The raw API key is shown once at creation and
-- only its SHA-256 hash is stored here.
create table if not exists public.spaces (
  id           text primary key,                 -- short public id (also memories.space_id)
  name         text not null default '',
  api_key_hash text not null,                     -- sha-256 hex of the raw key
  created_at   timestamptz not null default now()
);
create index if not exists spaces_api_key_hash_idx on public.spaces (api_key_hash);

-- Memories -------------------------------------------------------------------
-- IMPORTANT: vector(768) must match EMBED_DIM in wrangler.toml
-- (@cf/baai/bge-base-en-v1.5 -> 768 dims). Change both together if you swap models.
create table if not exists public.memories (
  id         uuid primary key default gen_random_uuid(),
  space_id   text not null references public.spaces(id) on delete cascade,
  content    text not null,
  tags       text[] not null default '{}',
  metadata   jsonb not null default '{}'::jsonb,
  embedding  vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_space_created_idx
  on public.memories (space_id, created_at desc);
create index if not exists memories_tags_idx
  on public.memories using gin (tags);
-- HNSW cosine index for semantic search (great recall at free-tier sizes).
create index if not exists memories_embedding_idx
  on public.memories using hnsw (embedding vector_cosine_ops);

-- Semantic search within a single space ---------------------------------------
create or replace function public.match_memories(
  p_space_id        text,
  p_query_embedding vector(768),
  p_match_count     int   default 8,
  p_min_similarity  float default 0.0
)
returns table (
  id         uuid,
  content    text,
  tags       text[],
  metadata   jsonb,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    m.id, m.content, m.tags, m.metadata, m.created_at,
    1 - (m.embedding <=> p_query_embedding) as similarity
  from public.memories m
  where m.space_id = p_space_id
    and m.embedding is not null
    and 1 - (m.embedding <=> p_query_embedding) >= p_min_similarity
  order by m.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 50));
$$;

-- Security -------------------------------------------------------------------
-- Enable RLS with NO policies. The public anon key can therefore read/write
-- nothing. Only the service-role key (used exclusively inside the Cloudflare
-- Worker, never exposed to clients) bypasses RLS. Clients authenticate to the
-- Worker with their space API key instead of talking to Supabase directly.
alter table public.spaces   enable row level security;
alter table public.memories enable row level security;
