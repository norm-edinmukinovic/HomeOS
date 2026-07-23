import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { loadDashboard, allCommands } from "@/lib/platform/registry";
import { themeFor } from "@/lib/ui/appTheme";
import { Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Dobro jutro";
  if (h < 18) return "Dobar dan";
  return "Dobro veče";
}

export default async function Dashboard() {
  installApps();
  const { db, user, householdId, displayName } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema domaćinstva…</p>;

  const sections = await loadDashboard({ db, householdId, userId: user.id });
  const commands = allCommands();

  return (
    <div className="animate-fade-up">
      {/* Poruka dobrodošlice */}
      <header className="mb-8 rounded-3xl bg-gradient-to-br from-mint-soft via-lav-soft to-peach-soft border border-line px-6 py-7 shadow-soft">
        <div className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <span>{greeting()}, {displayName}!</span>
          <span className="inline-block origin-bottom-right animate-wave">👋</span>
        </div>
        <p className="text-muted text-sm mt-1.5 flex items-center gap-1.5">
          <Sparkles size={15} className="text-lav" />
          {new Date().toLocaleDateString("bs", { weekday: "long", day: "numeric", month: "long" })}
          {" · "}evo šta te čeka danas.
        </p>
      </header>

      {/* Brzo unošenje */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2">
          {commands.map((c) => {
            const appId = c.id.split(".")[0];
            const t = themeFor(appId === "meal" ? "meal-planner" : appId);
            return (
              <Link
                key={c.id}
                href={c.run ?? "#"}
                className={`flex items-center gap-1.5 text-sm rounded-full border border-line bg-white px-3.5 py-1.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${t.iconText}`}
              >
                <Plus size={15} strokeWidth={2.5} />
                {c.label}
              </Link>
            );
          })}
        </div>
      </section>

      {sections.length === 0 ? (
        <EmptyToday />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {sections.map((s, i) => {
            const t = themeFor(s.appId);
            const Icon = t.icon;
            return (
              <div
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`animate-fade-up rounded-2xl border ${t.ring} bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift`}
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.iconBg} ${t.iconText}`}>
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <h2 className="text-sm font-medium text-ink">{s.title}</h2>
                </div>
                <ul className="divide-y divide-line">
                  {s.items.map((it) => (
                    <li key={it.id} className="px-4 py-2.5 flex items-center justify-between">
                      <Link href={it.href ?? "#"} className="text-sm text-ink transition-colors hover:text-muted">
                        {it.label}
                      </Link>
                      {it.meta && <span className="text-xs text-muted">{it.meta}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center shadow-soft">
      <div className="text-4xl mb-2">🎉</div>
      <p className="text-ink font-medium">Miran dan!</p>
      <p className="text-muted text-sm mt-1">
        Dodaj račun ili zadatak gore — pojavit će se ovdje čim dospije.
      </p>
    </div>
  );
}
