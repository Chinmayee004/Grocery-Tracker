-- ============================================================================
-- Shared Grocery List — Supabase schema migration
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- ── 1. grocery_items table ─────────────────────────────────────────────────
create table if not exists public.grocery_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  is_completed boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Indexes: user-scoped reads are the hot path (REST + realtime sync).
create index if not exists grocery_items_user_id_created_at_idx
  on public.grocery_items (user_id, created_at asc);

-- ── 2. Row Level Security ──────────────────────────────────────────────────
-- Hardens the DB even though the frontend only talks to our own backend.
alter table public.grocery_items enable row level security;

drop policy if exists "Users can read their own items"   on public.grocery_items;
drop policy if exists "Users can insert their own items" on public.grocery_items;
drop policy if exists "Users can update their own items" on public.grocery_items;
drop policy if exists "Users can delete their own items" on public.grocery_items;

create policy "Users can read their own items"
  on public.grocery_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own items"
  on public.grocery_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on public.grocery_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own items"
  on public.grocery_items for delete
  using (auth.uid() = user_id);

-- ── 3. Realtime broadcast (optional but recommended) ───────────────────────
alter publication supabase_realtime add table public.grocery_items;
