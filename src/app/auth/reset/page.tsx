"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Check } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 6) { setError("Lozinka mora imati bar 6 znakova."); return; }
    setLoading(true); setError(null);
    const db = createClient();
    const { error } = await db.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/");
  }

  return (
    <AuthShell title="Nova lozinka" subtitle="Postavi novu lozinku za svoj nalog.">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-ink flex items-center gap-1.5 mb-1"><Lock size={15} className="text-lav" /> Nova lozinka</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&submit()}
            placeholder="bar 6 znakova"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav" />
        </div>
        <button onClick={submit} disabled={loading||!password}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0">
          <Check size={16} /> {loading ? "Spremam…" : "Spremi lozinku"}
        </button>
        {error && <p className="text-rose text-xs">{error}</p>}
      </div>
    </AuthShell>
  );
}
