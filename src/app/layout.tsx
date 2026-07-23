import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { installApps } from "@/lib/apps";
import { navItems } from "@/lib/platform/registry";

export const metadata: Metadata = {
  title: "Home OS",
  description: "Jedno mjesto za sve u domacinstvu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // "Instaliraj" app-ove pri pokretanju. Navigacija se cita iz registra —
  // nema hardkodirane liste; deveti app se pojavi sam.
  installApps();
  const nav = navItems();

  return (
    <html lang="bs">
      <body>
        <div className="min-h-screen flex">
          <aside className="w-56 shrink-0 border-r border-line bg-white/60 px-4 py-6 hidden sm:block">
            <Link href="/" className="block px-2 mb-6">
              <span className="text-accent font-semibold tracking-wide">Home OS</span>
            </Link>
            <nav className="space-y-1">
              <NavLink href="/" label="Danas" />
              {nav.map((a) => (
                <NavLink key={a.id} href={a.route} label={a.name} />
              ))}
              <div className="pt-3 mt-3 border-t border-line">
                <NavLink href="/settings" label="Postavke" />
              </div>
            </nav>
          </aside>
          <main className="flex-1 px-6 py-8 max-w-4xl">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-accentSoft transition-colors"
    >
      {label}
    </Link>
  );
}
