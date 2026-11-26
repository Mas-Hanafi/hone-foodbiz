import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

const PROTECTED = ["/app", "/kasir", "/onboarding"];
const GUEST_ONLY = ["/login", "/signup"];

// Refreshes the Supabase session cookie and does optimistic redirects.
// Real authorization happens in getContext() and in Postgres RLS.
export async function proxy(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) {
    // Not configured yet: send protected routes to /login, which explains what to set.
    const path = request.nextUrl.pathname;
    return PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const signedIn = Boolean(data?.claims);

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && GUEST_ONLY.includes(path)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
