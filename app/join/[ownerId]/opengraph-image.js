import { ImageResponse } from "next/og";
import { createClient } from "../../../lib/supabase/server";
import { BRAND_ICON_OG_DATA_URI } from "../../../lib/brandIcon";

export const alt = "You're invited to join a Circle on HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (next/og's renderer) has no access to the browser/OS font stack a
// real page gets — without explicitly loading one, it falls back to its
// own generic sans-serif. This loads Arimo (an Arial substitute) at
// request time via Google Fonts' CSS endpoint, matching the site's actual
// Arial rendering. (Briefly switched to Nunito, reverted after feedback
// that the Nunito look wasn't wanted — matches the same revert on the
// main opengraph-image.js.)
async function loadFont(weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Arimo:wght@${weight}`;
  // Google serves WOFF2 by default to any modern user-agent, which Satori
  // (next/og's renderer) can't parse — it needs TTF/OTF specifically. This
  // exact old-Chrome user-agent string is the standard, widely-documented
  // trick to make the CSS2 endpoint respond with a TTF source instead.
  const css = await (
    await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    })
  ).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error("Could not find a TTF font URL in the Google Fonts CSS response");
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

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

  const [regular, bold] = await Promise.all([loadFont(700), loadFont(800)]).catch((err) => {
    console.error("Font load failed, falling back to default:", err.message);
    return [null, null];
  });
  const fonts = regular && bold
    ? [
        { name: "Arimo", data: regular, weight: 700, style: "normal" },
        { name: "Arimo", data: bold, weight: 800, style: "normal" },
      ]
    : undefined;

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
            <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "white" }}>{initials}</div>
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
            fontWeight: 800,
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
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1.6 }}>
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
