"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Check } from "lucide-react";
import { inviteMember } from "@/app/members/actions";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    if (!email.trim()) return;
    setError(null);
    start(async () => {
      const res = await inviteMember(email);
      if (res.error) { setError(res.error); return; }
      setEmail(""); setDone(true); setTimeout(() => setDone(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-4 mb-6">
      <label className="text-sm text-ink flex items-center gap-1.5 mb-2">
        <Mail size={15} className="text-teal" /> Pozovi člana e-mailom
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="clan@primjer.com"
          className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-teal"
        />
        <button
          onClick={submit}
          disabled={pending || !email.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-teal text-white text-sm px-4 py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0"
        >
          {done ? <Check size={16} /> : <Send size={16} />} {done ? "Pozvan" : "Pozovi"}
        </button>
      </div>
      <p className="text-muted text-xs mt-2">
        Poslat ćemo e-mail s pozivom. Kad se osoba registruje tim e-mailom, automatski se pridruži domaćinstvu.
      </p>
      {error && <p className="text-rose text-xs mt-2">{error}</p>}
    </div>
  );
}
