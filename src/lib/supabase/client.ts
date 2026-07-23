"use client";
import { createBrowserClient } from "@supabase/ssr";

// Klijent za browser (radi pod identitetom prijavljenog korisnika -> RLS aktivan)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
