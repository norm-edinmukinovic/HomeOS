"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setError(null);
    const db = createClient();
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) setError(error.message); else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Provjeri e-mail" subtitle="Poslali smo link za reset.">
        <div className="text-center py-2">
          <CheckCircle2 size={40} className="text-mint mx-auto mb-3" />
          <p className="text-sm text-ink">Link za promjenu lozinke poslan je na <strong>{email}</strong>.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Zaboravljena lozinka" subtitle="Poslat ćemo ti link za novu lozinku.">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-ink flex items-center gap-1.5 mb-1"><Mail size={15} className="text-lav" /> E-mail</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&submit()}
            placeholder="ti@primjer.com"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav" />
        </div>
        <button onClick={submit} disabled={loading||!email}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0">
          <Send size={16} /> {loading ? "Šaljem…" : "Pošalji link"}
        </button>
        {error && <p className="text-rose text-xs">{error}</p>}
        <p className="text-center text-sm text-muted pt-1">
          <Link href="/login" className="text-lav font-medium hover:underline">Nazad na prijavu</Link>
        </p>
      </div>
    </AuthShell>
  );
}
