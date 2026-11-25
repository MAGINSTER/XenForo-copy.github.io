-- XenForo Copy: initial Supabase schema
-- Run in Supabase SQL Editor. Review policies before production use.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('member','moderator','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_category_created_idx on public.threads(category_id, created_at desc);
create index if not exists posts_thread_created_idx on public.posts(thread_id, created_at asc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users can create their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Categories are publicly readable"
  on public.categories for select using (true);
create policy "Signed-in users can create threads"
  on public.threads for insert to authenticated with check (auth.uid() = author_id);
create policy "Threads are publicly readable"
  on public.threads for select using (true);
create policy "Authors can update their own threads"
  on public.threads for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Signed-in users can create posts"
  on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Posts are publicly readable"
  on public.posts for select using (true);
create policy "Authors can update their own posts"
  on public.posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Create a profile automatically after signup. Username can be changed later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
begin
  chosen_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user_' || substr(new.id::text, 1, 8)
  );

  insert into public.profiles (id, username)
  values (new.id, chosen_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed starter forum sections. Safe to re-run.
insert into public.categories (name, description, sort_order)
select seed.name, seed.description, seed.sort_order
from (values
  ('Общение', 'Общие разговоры и знакомство участников', 1),
  ('Новости и объявления', 'Важные новости сообщества и обновления', 2),
  ('Вопросы и помощь', 'Помощь, инструкции и решение проблем', 3),
  ('Торговая площадка', 'Покупка, продажа, обмен и предложения', 4)
) as seed(name, description, sort_order)
where not exists (
  select 1 from public.categories existing where existing.name = seed.name
);

-- Prevent users from assigning themselves elevated roles through the public API.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.role <> 'member' then
      raise exception 'New profiles must start as members';
    end if;
    if tg_op = 'UPDATE'
       and new.role is distinct from old.role
       and not exists (
         select 1 from public.profiles p
         where p.id = auth.uid() and p.role = 'admin'
       ) then
      raise exception 'Only an administrator can change profile roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_role();
