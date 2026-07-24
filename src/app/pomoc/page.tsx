import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import {
  HelpCircle, ListChecks, LayoutGrid, CalendarDays, Bell, StickyNote,
  Wallet, Archive, Users, Sparkles, ExternalLink, Puzzle, Link2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const APPS: { icon: any; name: string; desc: string }[] = [
  { icon: ListChecks, name: "Zadaci", desc: "Rokovi, prioriteti, odgovorna osoba, tagovi, ponavljanje; što kasni." },
  { icon: LayoutGrid, name: "Kanban", desc: "Više ploča; prevuci karticu Za uraditi → U toku → Gotovo (ispusti gdje je kursor)." },
  { icon: CalendarDays, name: "Kalendar", desc: "Mjesec / sedmica / dan. Zadaci s rokom se pojave sami; svi dijeljeni događaji na jednom mjestu." },
  { icon: Bell, name: "Podsjetnici", desc: "Jednokratni i ponavljajući, usmjereni na člana; in-app + e-mail." },
  { icon: StickyNote, name: "Bilješke", desc: "Tagovi, dnevnik, povezivanje na zadatak/račun/događaj." },
  { icon: Wallet, name: "Finansije", desc: "Prihodi/rashodi po kategoriji, budžeti, računi, sažetak, ko je platio / ko duguje." },
  { icon: Archive, name: "Kućni ured", desc: "Dokumenti, garancije, obnove, kontakti; rok → podsjetnik; dijeljene liste." },
  { icon: Users, name: "Članovi", desc: "Pozovi ukućane; dodijeli zadatke i podsjetnike; promjene vide svi." },
];

export default async function HelpPage() {
  const { user } = await getContext();
  if (!user) redirect("/login");

  const gh = process.env.NEXT_PUBLIC_HELP_URL; // npr. link na README na GitHubu

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-soft text-accent">
          <HelpCircle size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Pomoć & uputstvo</h1>
      </div>
      <p className="text-muted text-sm mb-6">
        Kratko uputstvo za upotrebu. Isti sadržaj je i README projekta na GitHub-u.
      </p>

      {gh && (
        <a href={gh} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-accent text-white text-sm px-4 py-2 mb-6 shadow-soft hover:brightness-105">
          <ExternalLink size={15} /> Otvori uputstvo na GitHub-u
        </a>
      )}

      {/* Šta je Home OS */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft mb-6">
        <h2 className="text-sm font-medium mb-2">Šta je Home OS?</h2>
        <p className="text-sm text-ink/80">
          Jedno mjesto za sve u domaćinstvu — zadaci, ploče, kalendar, podsjetnici,
          bilješke, finansije i kućni zapisi — dijeljeno između ukućana, uz e-mail
          obavijesti. Sve je <b>povezano</b>: račun napravi zadatak, zadatak s rokom
          se pojavi na kalendaru, obnova pokrene podsjetnik.
        </p>
      </section>

      {/* Aplikacije */}
      <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Puzzle size={15} /> Aplikacije</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {APPS.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.name} className="rounded-xl border border-line bg-white p-4 shadow-soft">
              <p className="text-sm font-medium flex items-center gap-2 mb-1"><Icon size={16} className="text-muted" /> {a.name}</p>
              <p className="text-xs text-muted">{a.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Postavke */}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft mb-6">
        <h2 className="text-sm font-medium mb-2">Postavke</h2>
        <ul className="text-sm text-ink/80 space-y-1.5 list-disc pl-5">
          <li><b>Sakrij/Prikaži (za mene):</b> uredi svoju navigaciju — ostavi samo ono što koristiš.</li>
          <li><b>Dostupno/Nedostupno (admin):</b> administrator uključuje ili isključuje app za cijelo domaćinstvo.</li>
          <li><b>E-mail obavijesti:</b> svaki član bira koje kategorije prima.</li>
          <li><b>Napravi novu aplikaciju:</b> opiši šta ti treba i s čime se povezuje — nova app se odmah pojavi svuda i koristi postojeće app-ove.</li>
        </ul>
      </section>

      {/* Kako su povezane */}
      <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Link2 size={15} /> Kako su stvari povezane</h2>
      <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <ConnectedWebDiagram />
        <ul className="text-sm text-ink/80 space-y-1.5 list-disc pl-5 mt-4">
          <li>Dodaš <b>račun</b> → nastane <b>zadatak</b> „Plati…".</li>
          <li><b>Zadatak s rokom</b> → automatski u <b>Kalendaru</b>.</li>
          <li><b>Obnova</b> (Kućni ured) → <b>podsjetnik</b> 7 dana ranije.</li>
          <li>Stavka u <b>tvojoj app-i</b> → zadatak / događaj / podsjetnik (po izboru).</li>
        </ul>
      </div>

      <p className="text-xs text-muted mt-6 flex items-center gap-1.5">
        <Sparkles size={13} className="text-lav" /> Detaljno uputstvo: <code>UPUTSTVO.md</code> / README u repozitoriju.
      </p>
    </div>
  );
}

function ConnectedWebDiagram() {
  return (
    <svg viewBox="0 0 760 300" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="300" y="20" width="160" height="44" rx="12" fill="#FDEAD9" stroke="#E28A57" />
      <text x="380" y="47" textAnchor="middle" fontSize="13" fill="#2C2A33">Finansije (račun)</text>
      <rect x="300" y="128" width="160" height="44" rx="12" fill="#E2F0FB" stroke="#3E92CC" />
      <text x="380" y="155" textAnchor="middle" fontSize="13" fill="#2C2A33">Zadatak „Plati…"</text>
      <rect x="80" y="128" width="160" height="44" rx="12" fill="#ECE6FA" stroke="#8574C4" />
      <text x="160" y="155" textAnchor="middle" fontSize="13" fill="#2C2A33">Kalendar</text>
      <rect x="520" y="128" width="160" height="44" rx="12" fill="#FBF1D3" stroke="#C99A17" />
      <text x="600" y="155" textAnchor="middle" fontSize="13" fill="#2C2A33">Podsjetnici</text>
      <rect x="180" y="236" width="180" height="44" rx="12" fill="#E6F0EA" stroke="#3C7A5E" />
      <text x="270" y="263" textAnchor="middle" fontSize="12" fill="#2C2A33">Kućni ured (obnova)</text>
      <rect x="400" y="236" width="180" height="44" rx="12" fill="#E4E9FF" stroke="#4C63D2" />
      <text x="490" y="263" textAnchor="middle" fontSize="12" fill="#2C2A33">Moja app (custom)</text>
      <g stroke="#837D89" strokeWidth="1.6" fill="none">
        <path d="M380 64 L380 128" />
        <path d="M300 150 L240 150" />
        <path d="M160 128 L160 128" />
        <path d="M270 236 L340 172" />
        <path d="M490 236 C 500 200, 460 175, 455 172" />
        <path d="M490 236 C 560 200, 600 180, 600 172" />
      </g>
    </svg>
  );
}
