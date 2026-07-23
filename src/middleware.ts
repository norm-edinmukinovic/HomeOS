import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const authPages = ["/login", "/register", "/forgot"];
  const isAuthPage = authPages.includes(path);
  const isAuthFlow = path.startsWith("/auth"); // /auth/callback, /auth/reset

  const redirectTo = (to: string) => NextResponse.redirect(new URL(to, request.url));

  if (user) {
    const hasUsername = !!user.user_metadata?.username;
    // Prijavljen bez username-a -> mora na onboarding (osim tokom auth flowa)
    if (!hasUsername && path !== "/onboarding" && !isAuthFlow) {
      return redirectTo("/onboarding");
    }
    // Prijavljen s username-om ne treba login/register stranice
    if (hasUsername && isAuthPage) {
      return redirectTo("/");
    }
  } else {
    // Neprijavljen -> samo auth stranice su dozvoljene
    if (!isAuthPage && !isAuthFlow) {
      return redirectTo("/login");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
