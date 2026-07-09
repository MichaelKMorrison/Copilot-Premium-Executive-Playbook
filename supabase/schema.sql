-- Run this once in your Supabase project's SQL editor.

create table if not exists public.progress (
  user_id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  completed_modules jsonb not null default '[]'::jsonb,
  thanked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Users can view own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.progress for update
  using (auth.uid() = user_id);
