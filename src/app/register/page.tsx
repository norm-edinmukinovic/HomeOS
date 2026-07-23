"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, UserPlus, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (password.length < 6) { setError("Lozinka mora imati bar 6 znakova."); return; }
    setLoading(true); setError(null);
    const db = createClient();
    const { error } = await db.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Potvrdi e-mail" subtitle="Skoro gotovo!">
        <div className="text-center py-2">
          <CheckCircle2 size={40} className="text-mint mx-auto mb-3" />
          <p className="text-sm text-ink">Poslali smo link za potvrdu na <strong>{email}</strong>.</p>
          <p className="text-muted text-xs mt-2">Otvori mail (provjeri i spam), klikni link, pa ćeš postaviti korisničko ime.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Napravi nalog" subtitle="Prvo e-mail i lozinka — jednom potvrdiš e-mail.">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-ink flex items-center gap-1.5 mb-1"><Mail size={15} className="text-lav" /> E-mail</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
            placeholder="ti@primjer.com"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav" />
        </div>
        <div>
          <label className="text-sm text-ink flex items-center gap-1.5 mb-1"><Lock size={15} className="text-lav" /> Lozinka</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&submit()}
            placeholder="bar 6 znakova"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav" />
        </div>
        <button onClick={submit} disabled={loading||!email||!password}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0">
          <UserPlus size={16} /> {loading ? "Kreiram…" : "Registruj se"}
        </button>
        {error && <p className="text-rose text-xs">{error}</p>}
        <p className="text-center text-sm text-muted pt-1">
          Već imaš nalog? <Link href="/login" className="text-lav font-medium hover:underline">Prijavi se</Link>
        </p>
      </div>
    </AuthShell>
  );
}
