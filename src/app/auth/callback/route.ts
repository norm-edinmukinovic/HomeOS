import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link / OTP callback. Supabase vraca korisnika ovdje s ?code=...
// Taj kod razmjenjujemo za sesiju (postavlja cookie), pa preusmjeravamo
// na trazenu stranicu. Bez ove rute prijava se "vrti" nazad na /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Neuspjeh -> nazad na login s naznakom greske
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
