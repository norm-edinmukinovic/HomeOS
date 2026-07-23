import type { Metadata } from "next";
import "./globals.css";
import { installApps } from "@/lib/apps";
import { navItems } from "@/lib/platform/registry";
import { NavSidebar } from "@/components/NavSidebar";

export const metadata: Metadata = {
  title: "Home OS",
  description: "Jedno mjesto za sve u domaćinstvu.",
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
          <NavSidebar nav={nav} />
          <main className="flex-1 px-6 py-8 max-w-4xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
