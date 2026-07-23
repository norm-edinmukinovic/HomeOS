import type { ReactNode } from "react";

// Zajednicki okvir za sve auth stranice (login, register, forgot, reset).
// Centriran, responzivan, s toplim gradijentom.
export function AuthShell({
  title, subtitle, children,
}: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="rounded-3xl border border-line bg-white shadow-lift overflow-hidden">
          <div className="bg-gradient-to-br from-mint-soft via-lav-soft to-peach-soft px-6 py-7 text-center">
            <div className="text-4xl mb-1">🏡</div>
            <h1 className="font-semibold text-lg text-ink">{title}</h1>
            <p className="text-muted text-sm mt-1">{subtitle}</p>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}