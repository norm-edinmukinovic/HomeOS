import type { Metadata } from "next";
import "./globals.css";
import { getVisibleNav } from "@/lib/platform/nav";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Home OS",
  description: "Jedno mjesto za sve u domaćinstvu.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = await getVisibleNav();
  return (
    <html lang="bs">
      <body>
        <AppShell nav={nav}>{children}</AppShell>
      </body>
    </html>
  );
}
