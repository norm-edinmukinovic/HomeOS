import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { loadDashboard, allCommands } from "@/lib/platform/registry";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  installApps();
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema domacinstva…</p>;

  // "Today" ekran — skuplja kartice iz SVIH app-ova. Ne zna za konkretne
  // app-ove; pita registar. (Dashboard iz zadatka.)
  const sections = await loadDashboard({ db, householdId, userId: user.id });
  const commands = allCommands();

  return (
    <div>
      <header className="mb-8">
        <p className="text-muted text-sm">
          {new Date().toLocaleDateString("bs", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-semibold mt-1">Danas</h1>
      </header>

      {/* Brzo unosenje (quick capture) preko komandne palete svih app-ova */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2">
          {commands.map((c) => (
            <Link
              key={c.id}
              href={c.run ?? "#"}
              className="text-sm rounded-full border border-line bg-white px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
            >
              + {c.label}
            </Link>
          ))}
        </div>
      </section>

      {sections.length === 0 ? (
        <EmptyToday />
      ) : (
        <div className="space-y-6">
          {sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-line bg-white">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <h2 className="text-sm font-medium">{s.title}</h2>
                <span className="text-xs text-muted">{s.app}</span>
              </div>
              <ul className="divide-y divide-line">
                {s.items.map((it) => (
                  <li key={it.id} className="px-4 py-2.5 flex items-center justify-between">
                    <Link href={it.href ?? "#"} className="text-sm hover:text-accent">
                      {it.label}
                    </Link>
                    {it.meta && <span className="text-xs text-muted">{it.meta}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-12 text-center">
      <p className="text-ink font-medium">Miran dan.</p>
      <p className="text-muted text-sm mt-1">
        Dodaj racun ili zadatak gore — pojavit ce se ovdje kad dospije.
      </p>
    </div>
  );
}
