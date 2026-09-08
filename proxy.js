import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { REGION_COOKIE, countryToRegion, isValidRegion } from "./lib/region";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Vercel's edge network sets this header automatically on every
// request in production - no extra package/dependency needed to read
// it. Falls back to null in local dev, where it's simply absent.
function detectCountry(request) {
  return (
    request.headers.get("x-vercel-ip-country") ||
    request.geo?.country || // older Next/Vercel runtimes exposed this directly
    null
  );
}

// Region routing lives here (rather than a separate middleware.js)
// because Next 16 only allows one proxy/middleware file per app, and
// this file already runs on every request. Handled first and
// returns early - the Supabase session refresh below still runs on
// every other route via the shared matcher.
function handleRegionRouting(request) {
  const { pathname } = request.nextUrl;
  const existingRegion = request.cookies.get(REGION_COOKIE)?.value;

  // Someone landed on the un-suffixed /shop - this is the "auto
  // detect on arrival" entry point. Prefer whatever region they've
  // already chosen (cookie, set either by a previous visit here or by
  // manually visiting /shop-uk or /shop-us below); only fall back to
  // geo-detection for a first-ever visit.
  if (pathname === "/shop" || pathname === "/shop/") {
    const region = isValidRegion(existingRegion)
      ? existingRegion
      : countryToRegion(detectCountry(request));

    const url = request.nextUrl.clone();
    url.pathname = `/shop-${region}`;

    const response = NextResponse.redirect(url);
    response.cookies.set(REGION_COOKIE, region, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
    return response;
  }

  // Someone is on a region-specific shop URL directly (manual choice,
  // a bookmarked link, or a link shared by someone else) - treat that
  // as an explicit override and remember it, so the next time they
  // land on plain /shop they go straight back to this region instead
  // of being geo-detected again.
  if (pathname === "/shop-uk" || pathname === "/shop-us") {
    const region = pathname === "/shop-uk" ? "uk" : "us";

    if (existingRegion !== region) {
      const response = NextResponse.next({ request });
      response.cookies.set(REGION_COOKIE, region, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
      });
      return response;
    }
  }

  return null;
}

export async function proxy(request) {
  const regionResponse = handleRegionRouting(request);
  if (regionResponse) return regionResponse;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
