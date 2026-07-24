-- =====================================================================
--  Home OS — migracija 0006
--  App management (dostupnost + skrivanje po korisniku) i korisničke
--  (custom) aplikacije koje se uklapaju kao i ugrađene.
--  Pokreni u Supabase SQL Editoru nakon 0001–0005.
-- =====================================================================

-- Admin uključuje/isključuje app za CIJELO domaćinstvo (nema reda = dostupno)
create table if not exists app_availability (
  household_id uuid not null references households (id) on delete cascade,
  app_id       text not null,             -- 'notes', 'finance', 'x:teretana' …
  available    boolean not null default true,
  primary key (household_id, app_id)
);

-- Korisnik sam sebi skriva app iz navigacije
create table if not exists app_hidden (
  user_id uuid not null references auth.users (id) on delete cascade,
  app_id  text not null,
  primary key (user_id, app_id)
);

-- Korisnički kreirane aplikacije (opisane u Postavkama, uklapaju se preko
-- generičkog engine-a i zajedničkih sposobnosti platforme).
create table if not exists custom_apps (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households (id) on delete cascade,
  slug             text not null,
  name             text not null,
  description      text,
  item_noun        text not null default 'stavka',
  connect_task     boolean not null default false,   -- kreiraj povezani zadatak
  connect_calendar boolean not null default false,   -- upiši u kalendar (ako ima datum)
  connect_reminder boolean not null default false,   -- zakaži podsjetnik (ako ima datum)
  created_by       uuid not null references auth.users (id),
  created_at       timestamptz not null default now(),
  unique (household_id, slug)
);

-- Stavke koje pripadaju korisničkoj aplikaciji (isti model kao ostali objekti).
create table if not exists custom_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  app_id       uuid not null references custom_apps (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  title        text not null,
  notes        text,
  due_at       timestamptz,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  RLS
-- ---------------------------------------------------------------------
alter table app_availability enable row level security;
alter table app_hidden       enable row level security;
alter table custom_apps      enable row level security;
alter table custom_items     enable row level security;

create policy app_availability_all on app_availability for all
  using (is_member(household_id)) with check (is_member(household_id));

create policy app_hidden_all on app_hidden for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy custom_apps_all on custom_apps for all
  using (is_member(household_id)) with check (is_member(household_id));

create policy custom_items_select on custom_items for select
  using (can_see(household_id, owner_id, visibility, shared_with));
create policy custom_items_insert on custom_items for insert
  with check (is_member(household_id) and owner_id = auth.uid());
create policy custom_items_update on custom_items for update
  using (owner_id = auth.uid() or exists (
    select 1 from household_members m
    where m.household_id = custom_items.household_id
      and m.user_id = auth.uid() and m.role = 'admin'));
create policy custom_items_delete on custom_items for delete
  using (owner_id = auth.uid() or exists (
    select 1 from household_members m
    where m.household_id = custom_items.household_id
      and m.user_id = auth.uid() and m.role = 'admin'));
