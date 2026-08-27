import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createClient } from "../../../lib/supabase/server";
import { BRAND_ICON_OG_DATA_URI } from "../../../lib/brandIcon";

export const alt = "You're invited to join a Circle on HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Needed for fs access to the bundled font files below — see the same
// fix and explanation in app/opengraph-image.js. This file previously
// fetched Arimo live from Google Fonts on every request; that failed in
// production ("Could not find a TTF font URL in the Google Fonts CSS
// response") because it was requesting a weight-800 Arimo, which
// doesn't exist for this font. Bundling the real files removes the
// live network dependency and the possibility of requesting a
// nonexistent weight entirely.
export const runtime = "nodejs";

const arimo600 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/arimo-600.ttf"));
const arimo700 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/arimo-700.ttf"));

export default async function Image({ params }) {
  const { ownerId } = await params;
  const supabase = await createClient();
  const { data: owner } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", ownerId)
    .maybeSingle();

  const ownerName = owner?.full_name || "Someone";
  const initials = ownerName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

  const fonts = [
    { name: "Arimo", data: arimo600, weight: 600, style: "normal" },
    { name: "Arimo", data: arimo700, weight: 700, style: "normal" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arimo",
          // The site's actual pearly background color, matching the
          // main opengraph-image.js and PublicShell.jsx — was a peach
          // gradient, replaced per direct feedback to stick to one
          // consistent background across the whole site.
          background: "#fffaf7",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: "50%",
            marginBottom: 36,
            border: "6px solid #ffffff",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            background: owner?.avatar_url ? "transparent" : "linear-gradient(160deg, #efcdbf, #bb8168)",
            boxShadow: "0 12px 32px rgba(173, 101, 72, 0.18)",
          }}
        >
          {owner?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={owner.avatar_url}
              width={160}
              height={160}
              // borderRadius on the parent's overflow:hidden alone isn't
              // always enough for Satori to clip a nested <img> — applying
              // it directly to the image itself is what actually works
              style={{ objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            // fontWeight 700, not 800 — Arimo's actual heaviest weight.
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "white" }}>{initials}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#c9633f",
            marginBottom: 20,
          }}
        >
          You're invited
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: -3.4,
            color: "#0f172a",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Join {ownerName}'s Circle
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 6px 16px rgba(255, 135, 93, 0.35)",
            }}
          >
            {/* The new standalone icon (see lib/brandIcon.js) — swapped
                for consistency with the main opengraph-image.js update.
                objectFit switched from cover to contain: the icon isn't
                square (491x577), and cover was cropping the bottom of
                the box off inside this fixed 48x48 container — caught by
                actually rendering this file through Satori and zooming
                in, not just from reading the code. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON_OG_DATA_URI} width={48} height={48} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: -1.6 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
            {/* Exact brand coral now that the background is the light
                site background instead of the peach gradient — matches
                the fix already applied to the main opengraph-image.js. */}
            <span style={{ color: "#ff875d" }}>Drop</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}
