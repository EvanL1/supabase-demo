-- ============================================================================
-- AI-native Task management — initial schema
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`.
--
-- NOTE: Kept as pure DDL (no plpgsql trigger functions) because some hosted
-- SQL editors mishandle dollar-quoted function bodies inside multi-statement
-- scripts. `updated_at` is bumped from the application layer instead.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tasks: per-user task records
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 500),
  notes      text,
  status     text not null default 'pending'
             check (status in ('pending', 'done')),
  priority   smallint not null default 0
             check (priority between 0 and 3),
  due_at     timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_status_idx
  on public.tasks (user_id, status, due_at nulls last);

alter table public.tasks enable row level security;

create policy tasks_select_own on public.tasks
  for select to authenticated
  using (auth.uid() = user_id);

create policy tasks_insert_own on public.tasks
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy tasks_update_own on public.tasks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy tasks_delete_own on public.tasks
  for delete to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- api_tokens: long-lived bearer tokens used by MCP clients
-- We store only the sha256 hash; plaintext is shown to user exactly once.
-- ----------------------------------------------------------------------------
create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists api_tokens_user_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

create policy api_tokens_select_own on public.api_tokens
  for select to authenticated
  using (auth.uid() = user_id);

create policy api_tokens_insert_own on public.api_tokens
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy api_tokens_delete_own on public.api_tokens
  for delete to authenticated
  using (auth.uid() = user_id);
