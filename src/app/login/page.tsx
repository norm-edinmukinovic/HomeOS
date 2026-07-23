"use client";
import { useState } from "react";
import Link from "next/link";
import { loginWithIdentifier } from "./actions";
import { User, Lock, LogIn } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(null);
    const res = await loginWithIdentifier(identifier, password);
    setLoading(false);
    if (res?.error) setError(res.error);
  }

  return (
    <AuthShell title="Dobro došli nazad" subtitle="Prijavi se korisničkim imenom ili e-mailom.">
      <div className="space-y-3">
        <Field icon={<User size={15} className="text-lav" />} label="Korisničko ime ili e-mail">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="npr. edin  ili  edin@primjer.com"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-lav"
          />
        </Field>
        <Field icon={<Lock size={15} className="text-lav" />} label="Lozinka">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-lav"
          />
        </Field>

        <div className="text-right">
          <Link href="/forgot" className="text-xs text-lav hover:underline">Zaboravljena lozinka?</Link>
        </div>

        <button
          onClick={submit}
          disabled={loading || !identifier || !password}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0"
        >
          <LogIn size={16} /> {loading ? "Prijavljujem…" : "Prijavi se"}
        </button>
        {error && <p className="text-rose text-xs">{error}</p>}

        <p className="text-center text-sm text-muted pt-1">
          Nemaš nalog?{" "}
          <Link href="/register" className="text-lav font-medium hover:underline">Registruj se</Link>
        </p>
      </div>
    </AuthShell>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-ink flex items-center gap-1.5 mb-1">{icon} {label}</label>
      {children}
    </div>
  );
}
