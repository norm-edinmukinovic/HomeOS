"use client";
import { useState } from "react";
import { setUsername } from "./actions";
import { AtSign, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function OnboardingPage() {
  const [username, setU] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(null);
    const res = await setUsername(username);
    setLoading(false);
    if (res?.error) setError(res.error);
  }

  return (
    <AuthShell title="Izaberi korisničko ime" subtitle="Time ćeš se ubuduće prijavljivati.">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-ink flex items-center gap-1.5 mb-1"><AtSign size={15} className="text-lav" /> Korisničko ime</label>
          <input value={username} onChange={(e)=>setU(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter"&&submit()}
            placeholder="npr. edin"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav" />
          <p className="text-muted text-xs mt-1">3–20 znakova: slova, brojevi ili _.</p>
        </div>
        <button onClick={submit} disabled={loading||!username}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lav text-white text-sm py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0">
          {loading ? "Spremam…" : "Nastavi"} <ArrowRight size={16} />
        </button>
        {error && <p className="text-rose text-xs">{error}</p>}
      </div>
    </AuthShell>
  );
}
