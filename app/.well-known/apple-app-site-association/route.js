import { NextResponse } from "next/server";

// Served at https://hintdrop.app/.well-known/apple-app-site-association
// (no file extension - iOS fetches this exact path over HTTPS to
// verify the app is allowed to handle these URL patterns as Universal
// Links, i.e. actually opening the installed app instead of Safari).
// A route handler rather than a static file in /public so the
// Content-Type is guaranteed correct (application/json) regardless of
// how the static file server would have classified an extension-less
// file - iOS's verification fetch is picky about this.
//
// appID format is "<Apple Team ID>.<bundle identifier>" - team ID
// NMPUC2X54M and bundle app.hintdrop.mobile both already in use
// elsewhere for this project (Apple Sign In config, app.json).
//
// Paths cover exactly what the app itself generates and shares -
// board shares (/b/*), hint shares (/h/*), profile shares (/profile/*),
// and contact/circle invite links (/join/*, /invite/*) - not every
// page on the site, since a Universal Link should only intercept the
// links this app's own share flows produce, not incidentally hijack
// every hintdrop.app URL someone might tap from anywhere else.
export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: "NMPUC2X54M.app.hintdrop.mobile",
            paths: ["/b/*", "/h/*", "/profile/*", "/join/*", "/join", "/invite/*"],
          },
        ],
      },
    },
    { headers: { "Content-Type": "application/json" } }
  );
}
