-- Octav Music — Supabase Cloud Library Schema & Row-Level Security
-- Paste & run this script in Supabase Dashboard -> SQL Editor to upgrade
-- sync storage from Auth user_metadata into a dedicated PostgreSQL table.

create table if not exists public.user_libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  liked_tracks jsonb not null default '[]'::jsonb,
  custom_playlists jsonb not null default '[]'::jsonb,
  followed_artists jsonb not null default '[]'::jsonb,
  listening_stats jsonb default null,
  updated_at timestamptz not null default now()
);

alter table public.user_libraries enable row level security;

drop policy if exists "Users can view their own library" on public.user_libraries;
create policy "Users can view their own library"
  on public.user_libraries
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own library" on public.user_libraries;
create policy "Users can insert their own library"
  on public.user_libraries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own library" on public.user_libraries;
create policy "Users can update their own library"
  on public.user_libraries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own library" on public.user_libraries;
create policy "Users can delete their own library"
  on public.user_libraries
  for delete
  using (auth.uid() = user_id);

create or replace function public.touch_user_libraries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_libraries_updated_at on public.user_libraries;
create trigger trg_user_libraries_updated_at
  before update on public.user_libraries
  for each row
  execute function public.touch_user_libraries_updated_at();
