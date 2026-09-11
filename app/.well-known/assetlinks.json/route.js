import { NextResponse } from "next/server";

// Served at https://hintdrop.app/.well-known/assetlinks.json - the
// Android equivalent of apple-app-site-association, verifying the
// app is allowed to handle these URLs as App Links.
//
// Needs ANDROID_SHA256_CERT_FINGERPRINT set as an env var - this is
// the SHA256 fingerprint of the app's signing certificate, which
// isn't something that can be known/guessed from source; it has to
// be retrieved from EAS directly:
//   npx eas credentials
//   -> Android -> select the build profile -> View existing
//   credentials -> the "SHA256 Fingerprint" shown there.
// Until that env var is set, this endpoint correctly reports no
// verified apps (an empty array) rather than a placeholder value
// that would look configured but silently fail Android's real
// verification check.
export async function GET() {
  const fingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT;
  const statements = fingerprint
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "app.hintdrop.mobile",
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ]
    : [];

  return NextResponse.json(statements, { headers: { "Content-Type": "application/json" } });
}
