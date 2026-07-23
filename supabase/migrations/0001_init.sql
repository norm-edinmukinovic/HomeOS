-- =====================================================================
--  Home OS — inicijalna sema
--  Pokreni ovo u Supabase: SQL Editor -> New query -> zalijepi -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
--  Enumi
-- ---------------------------------------------------------------------
create type visibility as enum ('private', 'household', 'shared');
create type member_role as enum ('admin', 'member');

-- ---------------------------------------------------------------------
--  Domacinstvo i clanovi
-- ---------------------------------------------------------------------
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         member_role not null default 'member',
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Kojoj kategoriji maila je clan rekao "ne". Prazno = prima sve.
create table notification_optouts (
  user_id   uuid not null references auth.users (id) on delete cascade,
  category  text not null,          -- npr. 'reminder', 'task_assigned', 'bill_due', 'digest'
  primary key (user_id, category)
);

-- ---------------------------------------------------------------------
--  Pomocna funkcija: da li je trenutni korisnik clan datog domacinstva
-- ---------------------------------------------------------------------
create or replace function is_member(h uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

-- Da li trenutni korisnik SMIJE vidjeti objekat s ovim poljima vidljivosti
create or replace function can_see(
  h uuid, owner uuid, vis visibility, shared uuid[]
) returns boolean
language sql
stable
as $$
  select is_member(h) and (
    vis = 'household'
    or owner = auth.uid()
    or (vis = 'shared' and auth.uid() = any(coalesce(shared, '{}')))
  );
$$;

-- ---------------------------------------------------------------------
--  Zajednicka polja: svaki "objekat" u sistemu ih ima.
--  (U Postgresu nema nasljedjivanja tabela kroz RLS zgodno, pa polja
--   ponavljamo — ali RLS politike su identicne, sto drzimo dosljednim.)
-- ---------------------------------------------------------------------

-- TASKS -----------------------------------------------------------------
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  title        text not null,
  notes        text,
  status       text not null default 'todo',   -- todo | doing | done
  priority     text not null default 'normal', -- low | normal | high
  due_at       timestamptz,
  assignee_id  uuid references auth.users (id),
  board        text,                            -- za kanban ("Kuca", "Posao"...)
  tags         text[] not null default '{}',
  parent_id    uuid references tasks (id) on delete cascade, -- pod-taskovi
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- BILLS (finance / pretplate) ------------------------------------------
create table bills (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  title        text not null,
  amount       numeric(12,2) not null default 0,
  category     text,
  due_at       timestamptz,
  recurring    text,                            -- npr. 'monthly', 'yearly', null
  paid_by      uuid references auth.users (id),
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- CALENDAR EVENTS ------------------------------------------------------
create table calendar_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  created_at   timestamptz not null default now()
);

-- NOTES ----------------------------------------------------------------
create table notes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'private',
  shared_with  uuid[] not null default '{}',
  title        text,
  body         text,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- REMINDERS ------------------------------------------------------------
create table reminders (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  owner_id     uuid not null references auth.users (id),
  visibility   visibility not null default 'household',
  shared_with  uuid[] not null default '{}',
  title        text not null,
  fire_at      timestamptz not null,
  recurring    text,                            -- 'daily' | 'weekly' | null
  target_id    uuid references auth.users (id), -- kome je namijenjen
  fired        boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  CONNECTED WEB: povezivanje bilo koja dva objekta
--  (racun kreira task, biljeska vezana za dogadjaj, itd.)
-- ---------------------------------------------------------------------
create table links (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  from_type    text not null,   -- 'bill' | 'task' | 'calendar_event' | 'note' | ...
  from_id      uuid not null,
  to_type      text not null,
  to_id        uuid not null,
  relation     text,            -- npr. 'created', 'about', 'blocks'
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  EVENT BUS (log): app-ovi objavljuju, drugi reaguju
-- ---------------------------------------------------------------------
create table platform_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  type         text not null,   -- 'bill.created', 'task.completed', ...
  actor_id     uuid references auth.users (id),
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

-- =====================================================================
--  ROW LEVEL SECURITY
--  Ovo je "The household stays in control" iz zadatka — pravila
--  privatnosti provodi SAMA baza, ne aplikacijski kod.
-- =====================================================================
alter table households            enable row level security;
alter table household_members     enable row level security;
alter table notification_optouts  enable row level security;
alter table tasks                 enable row level security;
alter table bills                 enable row level security;
alter table calendar_events       enable row level security;
alter table notes                 enable row level security;
alter table reminders             enable row level security;
alter table links                 enable row level security;
alter table platform_events       enable row level security;

-- Domacinstva: vidis ona cijim si clan; pravi svako (postaje admin).
create policy households_select on households for select
  using (is_member(id) or created_by = auth.uid());
create policy households_insert on households for insert
  with check (created_by = auth.uid());

-- Clanstvo: vidis clanove svojih domacinstava.
create policy members_select on household_members for select
  using (is_member(household_id));
create policy members_insert on household_members for insert
  with check (is_member(household_id) or user_id = auth.uid());

-- Opt-out: svako upravlja samo svojim.
create policy optout_all on notification_optouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- Generator politika za "objekat" tabele ---
-- SELECT: smijes vidjeti po can_see(); INSERT/UPDATE/DELETE: vlasnik ili admin.
do $$
declare t text;
begin
  foreach t in array array['tasks','bills','calendar_events','notes','reminders']
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

-- Linkovi i eventi: vidljivi clanovima domacinstva.
create policy links_select on links for select using (is_member(household_id));
create policy links_write  on links for insert with check (is_member(household_id));

create policy events_select on platform_events for select using (is_member(household_id));
create policy events_write  on platform_events for insert with check (is_member(household_id));

-- ---------------------------------------------------------------------
--  updated_at trigger za taskove
-- ---------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tasks_touch before update on tasks
  for each row execute function touch_updated_at();
