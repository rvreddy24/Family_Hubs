-- FamilyHubs.in: snapshot of full app state (optional Supabase persistence)
-- Run via Supabase SQL editor or: supabase db push

create table if not exists public.fh_app_state (
  id text primary key,
  tasks jsonb not null default '[]'::jsonb,
  hubs jsonb not null default '[]'::jsonb,
  extras jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Add extras column when upgrading an older deployment
alter table public.fh_app_state
  add column if not exists extras jsonb not null default '{}'::jsonb;

-- Identity verification audit log (used by Identity Guard flow)
create table if not exists public.fh_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  task_id text,
  id_asset_url text,
  face_asset_url text,
  verified_by text,
  created_at timestamptz not null default now()
);

comment on table public.fh_app_state is 'FamilyHubs app snapshot (server access only — service role).';
comment on column public.fh_app_state.extras is 'parents, providers, notes, wallets, transactions (JSON arrays).';
