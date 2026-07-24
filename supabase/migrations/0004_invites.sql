-- =====================================================================
--  Home OS — pozivi u domacinstvo
--  Pokreni u Supabase SQL Editoru NAKON 0001–0003
-- =====================================================================

create table invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  email        text not null,
  invited_by   uuid references auth.users (id),
  created_at   timestamptz not null default now()
);

create index invites_email_idx on invites (lower(email));

alter table invites enable row level security;

-- Clanovi domacinstva vide i upravljaju pozivima svog domacinstva.
-- (Samo pridruzivanje pozvanog korisnika radi se serverski, admin klijentom.)
create policy invites_select on invites for select using (is_member(household_id));
create policy invites_insert on invites for insert with check (is_member(household_id));
create policy invites_delete on invites for delete using (is_member(household_id));
