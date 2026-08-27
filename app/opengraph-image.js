import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { BRAND_ICON_OG_DATA_URI } from "../lib/brandIcon";

export const alt = "HintDrop — Never forget. Always thoughtful.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Needed for fs access to the bundled font files below — the OG image
// convention defaults to Edge runtime, which has no filesystem access
// at all. Previously fetched Arimo live from Google Fonts' CSS endpoint
// on every request instead; that turned out to be genuinely fragile in
// production (confirmed via a real Vercel build log: "Could not find a
// TTF font URL in the Google Fonts CSS response", silently falling back
// to Satori's generic default font). Root cause: the code was
// requesting Arimo at weight 800, which doesn't exist for this font
// (Arimo only goes up to 700) — Google's response for a nonexistent
// weight didn't match the expected pattern. Switched to bundling the
// real font files directly (via @fontsource/arimo, converted from WOFF
// to TTF at lib/fonts/) so there's no live network dependency, no
// user-agent trickery, and no possibility of requesting a weight that
// doesn't exist, ever again.
export const runtime = "nodejs";

const arimo600 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/arimo-600.ttf"));
const arimo700 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/arimo-700.ttf"));

export default async function Image() {
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
          // The site's actual background color (matches PublicShell.jsx),
          // not a custom gradient — so the shared preview looks like the
          // real site people land on, not a separate marketing treatment.
          background: "#fffaf7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40 }}>
          {/* The new standalone icon (see lib/brandIcon.js), rendered
              directly with no colored badge/border wrapper around it —
              the previous rounded-square badge was specifically what
              needed removing per design feedback. Sized/positioned to
              match the approved preview (220px height). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_ICON_OG_DATA_URI} width={187} height={220} style={{ objectFit: "contain" }} />
          {/* fontWeight 700, not 800 — Arimo's actual heaviest weight;
              800 doesn't exist for this font and was the root cause of
              the production font-loading failure. */}
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -4.8 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
            {/* Exact brand coral, #ff875d — no longer needs deepening for
                readability now that the background is the light site
                background instead of a peach gradient. */}
            <span style={{ color: "#ff875d" }}>Drop</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 38,
            fontWeight: 600,
            color: "#5a4a42",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          Never forget. Always thoughtful.
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
