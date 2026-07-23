import type { Metadata } from "next";
import "./globals.css";
import { installApps } from "@/lib/apps";
import { navItems } from "@/lib/platform/registry";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Home OS",
  description: "Jedno mjesto za sve u domaćinstvu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  installApps();
  const nav = navItems();
  return (
    <html lang="bs">
      <body>
        <AppShell nav={nav}>{children}</AppShell>
      </body>
    </html>
  );
}
