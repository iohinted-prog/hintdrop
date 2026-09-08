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

function resolveRegion(request) {
  const existingRegion = request.cookies.get(REGION_COOKIE)?.value;
  return isValidRegion(existingRegion) ? existingRegion : countryToRegion(detectCountry(request));
}

function withRegionCookie(response, region) {
  response.cookies.set(REGION_COOKIE, region, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  return response;
}

// Both un-suffixed entry points converge on the same rule: signed-in
// visitors get the full app experience (/shop-{region} - saving to
// hints, boards, etc.), signed-out visitors get the public browsing
// page (/gift-shop-{region} - sign-in prompts instead). Someone who
// clicks a shared /gift-shop link while already signed in still gets
// routed into the real app rather than the marketing version of it.
const REGION_ENTRY_POINTS = ["/shop", "/gift-shop"];
// Direct visits to a suffixed path are a manual override (of region,
// not of which app experience) and keep going to whichever
// experience that exact path names - no auth check here.
const REGION_ROUTE_BASES = ["/shop", "/gift-shop"];

function handleRegionRouting(request, isSignedIn) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const existingRegion = request.cookies.get(REGION_COOKIE)?.value;

  if (REGION_ENTRY_POINTS.includes(normalizedPath)) {
    const region = resolveRegion(request);
    const base = isSignedIn ? "/shop" : "/gift-shop";

    const url = request.nextUrl.clone();
    url.pathname = `${base}-${region}`;

    return withRegionCookie(NextResponse.redirect(url), region);
  }

  for (const base of REGION_ROUTE_BASES) {
    if (normalizedPath === `${base}-uk` || normalizedPath === `${base}-us`) {
      const region = normalizedPath === `${base}-uk` ? "uk" : "us";
      if (existingRegion !== region) {
        return withRegionCookie(NextResponse.next({ request }), region);
      }
      return null;
    }
  }

  return null;
}

export async function proxy(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const regionResponse = handleRegionRouting(request, false);
    return regionResponse || NextResponse.next({ request });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Region routing needs to know auth state (see handleRegionRouting
  // above), so it runs after the session refresh rather than before
  // it - the session cookie refresh above has already happened by
  // this point regardless of which response we return next.
  const regionResponse = handleRegionRouting(request, Boolean(user));
  if (regionResponse) return regionResponse;

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
