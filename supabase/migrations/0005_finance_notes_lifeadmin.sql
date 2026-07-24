-- =====================================================================
--  Home OS — migracija 0005
--  Dodaje: Finance (transakcije + budžeti), Life admin (zapisi + liste).
--  Notes tabela već postoji u 0001; ovdje samo dopunjujemo ostalo.
--  Pokreni u Supabase SQL Editoru nakon 0001–0004.
-- =====================================================================

-- ---------------------------------------------------------------------
--  FINANCE: transakcije (prihod/rashod po kategoriji)
-- ---------------------------------------------------------------------
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  kind         text not null default 'expense',   -- 'expense' | 'income'
  title        text not null,
  amount       numeric(12,2) not null default 0,
  category     text not null default 'Ostalo',
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- FINANCE: mjesečni budžet po kategoriji (na nivou domaćinstva)
create table if not exists budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households (id) on delete cascade,
  category      text not null,
  monthly_limit numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  unique (household_id, category)
);

-- ---------------------------------------------------------------------
--  LIFE ADMIN: kućni zapisi (dokumenti, garancije, obnove, kontakti)
-- ---------------------------------------------------------------------
create table if not exists life_records (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  kind         text not null default 'document',  -- document | warranty | renewal | contact | other
  title        text not null,
  provider     text,                              -- npr. osiguranje, dobavljač
  reference    text,                              -- broj polise / telefon / e-mail
  notes        text,
  expiry_at    timestamptz,                       -- rok isteka / obnove
  created_at   timestamptz not null default now()
);

-- LIFE ADMIN: dijeljene liste (kupovina, kućni popisi)
create table if not exists shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  name         text not null,
  created_at   timestamptz not null default now()
);

create table if not exists shopping_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references shopping_lists (id) on delete cascade,
  household_id uuid not null references households (id) on delete cascade,
  text         text not null,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  ROW LEVEL SECURITY (isti obrazac kao 0001)
-- ---------------------------------------------------------------------
alter table transactions   enable row level security;
alter table budgets        enable row level security;
alter table life_records   enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;

-- Objekti s vlasnikom/vidljivošću → can_see (privatno/domaćinstvo/dijeljeno).
do $$
declare t text;
begin
  foreach t in array array['transactions','life_records']
  loop
    execute format($f$
      create policy %1$s_select on %1$s for select
        using (can_see(household_id, owner_id, visibility, shared_with));
      create policy %1$s_insert on %1$s for insert
        with check (is_member(household_id) and owner_id = auth.uid());
      create policy %1$s_update on %1$s for update
        using (owner_id = auth.uid() or exists (
          select 1 from household_members m
          where m.household_id = %1$s.household_id
            and m.user_id = auth.uid() and m.role = 'admin'));
      create policy %1$s_delete on %1$s for delete
        using (owner_id = auth.uid() or exists (
          select 1 from household_members m
          where m.household_id = %1$s.household_id
            and m.user_id = auth.uid() and m.role = 'admin'));
    $f$, t);
  end loop;
end $$;

-- Budžeti i liste su na nivou domaćinstva → vidljivi/uređivi svim članovima.
create policy budgets_all on budgets for all
  using (is_member(household_id)) with check (is_member(household_id));

create policy shopping_lists_all on shopping_lists for all
  using (is_member(household_id)) with check (is_member(household_id));

create policy shopping_items_all on shopping_items for all
  using (is_member(household_id)) with check (is_member(household_id));
