import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(request) {
  console.log("ACTIVE PROXY FILE LOADED");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("SUPABASE URL exists:", !!supabaseUrl);
  console.log("SUPABASE URL value:", supabaseUrl);
  console.log("SUPABASE ANON exists:", !!supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        error: "Missing Supabase env vars",
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
      },
      { status: 500 }
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set(name, value, options);
      },
      remove(name, options) {
        response.cookies.set(name, "", options);
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};