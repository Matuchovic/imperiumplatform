import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED = ["/dashboard"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Výpadek middleware položí celý web. Když se ověřit nedá, chráněné
  // stránky se zavřou a veřejné zůstanou dostupné — nikdy se nespadne.
  if (!url || !anon) {
    console.error("[middleware] chybí veřejné Supabase proměnné");
    return isProtected ? redirectToLogin(req) : res;
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list: CookieToSet[]) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    // getUser() ověřuje token u Supabase. getSession() jen čte cookie,
    // kterou lze podvrhnout — pro rozhodování o přístupu se nehodí.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtected && !user) return redirectToLogin(req);

    if ((pathname === "/login" || pathname === "/registrace") && user) {
      const to = req.nextUrl.clone();
      to.pathname = "/dashboard";
      to.search = "";
      return NextResponse.redirect(to);
    }

    return res;
  } catch (err) {
    console.error("[middleware] ověření selhalo:", err);
    return isProtected ? redirectToLogin(req) : res;
  }
}

function redirectToLogin(req: NextRequest) {
  const to = req.nextUrl.clone();
  to.pathname = "/login";
  to.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(to);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/registrace"],
};
