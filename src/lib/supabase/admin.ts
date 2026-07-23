import { createClient as createSbClient } from "@supabase/supabase-js";

// SAMO za pouzdane server procese (cron rute). Zaobilazi RLS preko
// service_role kljuca — zato se NIKAD ne smije koristiti u kodu koji ide
// klijentu. Koristi se da cron moze procitati sve dospjele podsjetnike
// bez korisnicke sesije.
export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
