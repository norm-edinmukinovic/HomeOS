# Home OS

Lični „operativni sistem za kuću" — jedna aplikacija koja objedinjuje life-admin
domaćinstva (zadaci, kanban, kalendar, podsjetnici, bilješke, finansije), dijeljena
između ukućana, uz email obavijesti. Napravljeno kao **platforma**: novi app se
ukopča samo svojim manifestom, bez izmjena postojećeg koda.

Stack: **Next.js (App Router) + React + TypeScript**, **Supabase** (Postgres + Auth
+ RLS), **Resend** (email), **Vercel** (hosting + Cron).

---

## Šta je već napravljeno

- **Jezgro platforme:** zajednički model objekata, `links` tabela (connected web),
  event bus (`platform_events` + `publish/subscribe`), registar app-ova i
  `AppManifest` ugovor.
- **Dozvole:** Row Level Security u Supabase (privatno / cijelo domaćinstvo /
  određeni članovi) — pravila provodi sama baza.
- **Zajednički servisi:** email (Resend + React Email) s provjerom korisnikovih
  postavki, cron za podsjetnike i dnevni digest.
- **App-ovi:** Zadaci, Finansije, Kalendar, Podsjetnici — svaki se registruje
  manifestom i koristi zajedničke servise.
- **Dokaz proširivosti:** Planer obroka (deveti app) — dodan samo manifestom,
  koristi postojeći Tasks umjesto vlastitog, objavljuje `meal.planned`.
- **Povezanost:** dodavanje računa objavi `bill.created` → automatski nastaje
  povezani zadatak „Plati…“. Isto planiranje obroka → zadatak „Kupi sastojke…“.

## Šta ti trebaš podesiti (korak po korak)

### 1. Supabase
1. Napravi projekat na supabase.com.
2. U **SQL Editor** zalijepi cijeli `supabase/migrations/0001_init.sql` i pokreni.
3. U **Project Settings → API** uzmi: `Project URL`, `anon` ključ i `service_role`
   ključ.
4. U **Authentication → Providers** ostavi uključen Email (magic link je zadano).

### 2. Resend (email)
1. Napravi nalog na resend.com i **API Key**.
2. Za testiranje možeš slati s `onboarding@resend.dev`. Za pravu domenu:
   **Domains → Add Domain** i ubaci ponuđene DNS zapise (SPF/DKIM) kod svog
   registrara. Kad domena bude „Verified", u `EMAIL_FROM` stavi svoju adresu.

### 3. Lokalno pokretanje
```bash
cp .env.example .env.local   # popuni vrijednostima odozgo
npm install
npm run dev                  # http://localhost:3000
```

### 4. Deploy na Vercel
1. Gurni kod na GitHub, pa **Import Project** na vercel.com.
2. U **Settings → Environment Variables** dodaj SVE iz `.env.example`
   (`NEXT_PUBLIC_APP_URL` stavi na svoju Vercel adresu).
3. Deploy. Cron iz `vercel.json` se aktivira sam.

> Napomena o cronu: na Vercel Hobby planu raspored zna biti ograničen. Ako trebaš
> podsjetnike „na minutu", koristi Vercel Pro, vanjski pinger (cron-job.org) koji
> zove `/api/cron/reminders`, ili Supabase `pg_cron`. Rute su zaštićene
> `CRON_SECRET`-om (šalji `Authorization: Bearer <CRON_SECRET>`).

## Kako dodati novi (deseti) app — dokaz proširivosti

1. Napravi `src/lib/apps/<ime>/manifest.ts` koji izvozi `AppManifest`.
2. Registruj ga u `src/lib/apps/index.ts` (jedna linija).
3. Gotovo — pojavi se u navigaciji, na „Danas", u pretrazi i paleti.
   Ništa drugo se ne dira. Vidi `meal-planner` kao primjer: koristi tuđe
   servise (`createTask`), objavljuje događaj i traži samo pristup koji mu treba.

## Mapiranje na zadatak (za odbranu)

| Zahtjev iz zadatka | Gdje u kodu |
|---|---|
| Dashboard „Today" + pretraga + paleta | `src/app/page.tsx`, `platform/registry.ts` |
| Tasks / Kanban (board polje) | `apps/tasks/*`, `tasks` tabela |
| Calendar | `apps/calendar/*`, `calendar_events` |
| Reminders (jednokratni + ponavljajući) | `apps/reminders/*`, `api/cron/reminders` |
| Finance (računi, pretplate) | `apps/finance/*`, `bills` |
| „Sve povezano" | `links` tabela, `linkObjects()` |
| Email + digest + postavke po članu | `email/*`, `api/cron/digest`, `app/settings` |
| Dijeljenje / kontrola (privatno/dom./članovi) | RLS u `0001_init.sql` |
| Apps sarađuju bez direktne veze | event bus `platform/events.ts` |
| Proširivost / novi app | `AppManifest`, `registry.ts`, `apps/meal-planner` |

## Status app-ova (svih 8 iz zadatka)

- **Dashboard „Danas"** — pretraga + quick capture + kartice svih app-ova.
- **Tasks** — rokovi, prioriteti, odgovorni, pod-zadaci, tagovi, ponavljanje.
- **Kanban** — više ploča, drag & drop (`@dnd-kit`).
- **Kalendar** — mjesec / sedmica / dan; zadaci s rokom i dijeljeni događaji u istom pogledu.
- **Podsjetnici** — jednokratni + ponavljajući, usmjereni na člana, in-app + email (cron).
- **Bilješke** — tagovi, dnevnik, povezivanje na zadatak/račun/događaj (`links`).
- **Finansije** — prihodi/rashodi po kategoriji, budžeti, računi/pretplate, mjesečni
  sažetak, „ko je platio / ko duguje".
- **Kućni ured (Life admin)** — dokumenti, garancije, obnove, kontakti; rok obnove
  automatski kreira podsjetnik (koristi postojeći Reminders app); dijeljene liste.

> Migracija baze: pokreni `supabase/migrations/0005_finance_notes_lifeadmin.sql`
> u Supabase SQL Editoru (nakon 0001–0004). Realtime sinhronizacija preko Supabase
> Realtime ostaje kao moguće proširenje (baza je spremna).
