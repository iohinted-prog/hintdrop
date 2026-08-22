import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Handles email confirmation links using Supabase's token_hash + type
// verification (supabase.auth.verifyOtp), rather than PKCE code exchange.
//
// /auth/callback's exchangeCodeForSession(code) requires a code_verifier
// cookie that was set in the SAME browser where signUp() was originally
// called. That breaks constantly in practice for email confirmation
// specifically, because people very often open the confirmation link in a
// different context than where they signed up — a different device, or an
// in-app browser inside Gmail/Outlook/etc. — so the cookie simply isn't
// there and the exchange fails every time, even though the link itself is
// perfectly valid. token_hash verification has no such requirement: the
// token is self-contained and works from any browser.
//
// This route expects Supabase's "Confirm signup" (and similarly "Magic
// Link", "Invite", "Change email address") templates to link here with
// token_hash and type, e.g.:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding
// instead of the default {{ .ConfirmationURL }}, which points at Supabase's
// hosted verify endpoint and is what triggers the PKCE code flow above.
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const inviteToken = requestUrl.searchParams.get("invite_token");
  const inviteType = requestUrl.searchParams.get("invite_type");
  const circleOwner = requestUrl.searchParams.get("circle_owner");
  const next = requestUrl.searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/auth/auth-code-error", requestUrl.origin)
    );
  }

  const cookiesToWrite = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => cookiesToWrite.push(cookie));
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("Auth confirm error:", error.message);
    return NextResponse.redirect(
      new URL("/auth/auth-code-error", requestUrl.origin)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mirror the confirmation onto profiles.email_verified_at so existing UI
  // (the verified badge in Settings/Account) keeps working unchanged, now
  // driven by this robust flow instead of the old custom token system.
  if (user && (type === "signup" || type === "email" || type === "email_change")) {
    await supabase
      .from("profiles")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  let destination = next || "/";

  if (user && !next) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingComplete = Boolean(profile?.onboarding_completed);

    if (inviteToken && inviteType) {
      const joinUrl = new URL(
        onboardingComplete ? "/feed" : "/onboarding",
        requestUrl.origin
      );
      joinUrl.searchParams.set("invite_token", inviteToken);
      joinUrl.searchParams.set("invite_type", inviteType);
      destination = `${joinUrl.pathname}${joinUrl.search}`;
    } else if (circleOwner && !onboardingComplete) {
      const joinUrl = new URL("/onboarding", requestUrl.origin);
      joinUrl.searchParams.set("circle_owner", circleOwner);
      destination = `${joinUrl.pathname}${joinUrl.search}`;
    } else {
      destination = onboardingComplete ? "/feed" : "/onboarding";
    }
  }

  const response = NextResponse.redirect(
    new URL(destination, requestUrl.origin)
  );

  response.headers.set("Cache-Control", "private, no-store");

  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
