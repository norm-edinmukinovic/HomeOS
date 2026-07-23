"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      options: { emailRedirectTo: `${window.location.origin}` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="max-w-sm mx-auto mt-24">
      <h1 className="text-accent font-semibold text-lg mb-1">Home OS</h1>
      <p className="text-muted text-sm mb-6">Prijavi se e-mailom da uđeš u domaćinstvo.</p>

      {sent ? (
        <div className="rounded-xl border border-line bg-white px-4 py-4 text-sm">
          Poslali smo ti link za prijavu na <strong>{email}</strong>. Otvori ga na ovom uređaju.
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ti@primjer.com"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={signIn}
            disabled={loading || !email}
            className="w-full rounded-lg bg-accent text-white text-sm py-2 disabled:opacity-50"
          >
            {loading ? "Šaljem…" : "Pošalji link za prijavu"}
          </button>
          {error && <p className="text-warn text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}
