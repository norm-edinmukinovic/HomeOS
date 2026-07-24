-- =====================================================================
--  Home OS — profili (username) za prijavu
--  Pokreni u Supabase SQL Editoru NAKON 0001_init.sql
-- =====================================================================

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  created_at timestamptz not null default now()
);

-- Username jedinstven bez obzira na velika/mala slova
create unique index profiles_username_lower on profiles (lower(username));

alter table profiles enable row level security;

-- Svako vidi i mijenja samo svoj profil
create policy profiles_select_own on profiles for select
  using (id = auth.uid());
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid());
create policy profiles_update_own on profiles for update
  using (id = auth.uid());
