"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { themeFor } from "@/lib/ui/appTheme";

export function NavSidebar({ nav }: { nav: { id: string; name: string; route: string }[] }) {
  const pathname = usePathname();

  // Na login stranici ne prikazujemo navigaciju.
  if (pathname === "/login") return null;

  const items = [
    { id: "dashboard", name: "Danas", route: "/" },
    ...nav,
    { id: "settings", name: "Postavke", route: "/settings" },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-white/70 px-3 py-6 hidden sm:block">
      <Link href="/" className="flex items-center gap-2 px-3 mb-7">
        <span className="text-xl">🏡</span>
        <span className="font-semibold tracking-tight text-ink">Home OS</span>
      </Link>
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
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${t.iconBg} ${t.iconText}`}
              >
                <Icon size={17} strokeWidth={2.2} />
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
