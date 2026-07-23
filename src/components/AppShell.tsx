"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { themeFor } from "@/lib/ui/appTheme";

type NavItem = { id: string; name: string; route: string };

const AUTH_PREFIXES = ["/login", "/register", "/forgot", "/onboarding", "/auth"];

export function AppShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Zatvori mobilni meni pri promjeni stranice
  useEffect(() => { setOpen(false); }, [pathname]);

  const isAuth = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));

  // Auth stranice: bez navigacije, pun ekran
  if (isAuth) return <>{children}</>;

  const items: NavItem[] = [
    { id: "dashboard", name: "Danas", route: "/" },
    ...nav,
    { id: "settings", name: "Postavke", route: "/settings" },
  ];

  const NavList = () => (
    <nav className="space-y-1">
      {items.map((item, i) => {
        const t = themeFor(item.id);
        const Icon = t.icon;
        const active = item.route === "/" ? pathname === "/" : pathname.startsWith(item.route);
        const isSettings = item.id === "settings";
        return (
          <Link
            key={item.id}
            href={item.route}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 animate-fade-up ${
              active ? t.navActive + " font-medium" : "text-ink " + t.navHover
            } ${isSettings ? "mt-3 border-t border-line pt-3 rounded-t-none" : ""}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${t.iconBg} ${t.iconText}`}>
              <Icon size={17} strokeWidth={2.2} />
            </span>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Mobilna gornja traka */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 backdrop-blur px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🏡</span>
          <span className="font-semibold text-ink">Home OS</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Otvori meni"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink"
        >
          <Menu size={18} />
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="w-60 shrink-0 border-r border-line bg-white/70 px-3 py-6 hidden md:block">
          <Link href="/" className="flex items-center gap-2 px-3 mb-7">
            <span className="text-xl">🏡</span>
            <span className="font-semibold tracking-tight text-ink">Home OS</span>
          </Link>
          <NavList />
        </aside>

        {/* Glavni sadrzaj — centriran da ne ostaje prazna polovina */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-3xl px-5 py-8">{children}</div>
        </main>
      </div>

      {/* Mobilni drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-paper border-r border-line px-3 py-5 shadow-lift animate-fade-up">
            <div className="flex items-center justify-between px-3 mb-6">
              <span className="font-semibold text-ink flex items-center gap-2"><span className="text-xl">🏡</span> Home OS</span>
              <button onClick={() => setOpen(false)} aria-label="Zatvori meni"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line">
                <X size={18} />
              </button>
            </div>
            <NavList />
          </div>
        </div>
      )}
    </div>
  );
}
