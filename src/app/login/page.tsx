"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Send, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true); setError(null);
    const db = createClient();
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="rounded-3xl border border-line bg-white shadow-lift overflow-hidden">
          <div className="bg-gradient-to-br from-mint-soft via-lav-soft to-peach-soft px-6 py-7 text-center">
            <div className="text-4xl mb-1">🏡</div>
            <h1 className="font-semibold text-lg text-ink">Home OS</h1>
            <p className="text-muted text-sm mt-1">Jedno mjesto za cijelo domaćinstvo.</p>
          </div>

          <div className="p-6">
            {sent ? (
              <div className="text-center py-2">
                <CheckCircle2 size={40} className="text-mint mx-auto mb-3" />
                <p className="text-sm text-ink">
                  Poslali smo link za prijavu na <strong>{email}</strong>.
                </p>
                <p className="text-muted text-xs mt-2">Otvori mail (pogledaj i spam) i klikni link.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm text-ink flex items-center gap-1.5">
                  <Mail size={15} className="text-lav" /> Prijavi se e-mailom
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ti@primjer.com"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-lav"
                />
                <button
                  onClick={signIn}
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0"
                >
                  <Send size={16} /> {loading ? "Šaljem…" : "Pošalji link za prijavu"}
                </button>
                {error && <p className="text-rose text-xs">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
