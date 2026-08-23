import { ImageResponse } from "next/og";
import { BRAND_ICON_DATA_URI } from "../lib/brandIcon";

export const alt = "HintDrop — Never forget. Always thoughtful.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (next/og's renderer) has no access to the browser/OS font stack a
// real page gets — without explicitly loading one, it falls back to its
// own generic sans-serif, which looks nothing like the app's actual Arial.
// Arial itself isn't freely redistributable, so this loads Arimo — an
// open-source, metrically-compatible substitute purpose-built for exactly
// this situation — at request time via Google Fonts' CSS endpoint.
async function loadFont(weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Arimo:wght@${weight}`;
  // Google serves WOFF2 by default to any modern user-agent, which Satori
  // can't parse — it needs TTF/OTF specifically. This exact old-Chrome
  // user-agent is the standard, widely-documented trick to make the CSS2
  // endpoint respond with a TTF source instead.
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

export default async function Image() {
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
          // A darker, more saturated peach throughout
          background: "linear-gradient(160deg, #ffd4b8 0%, #ffc19b 55%, #ffaf7e 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 110,
              height: 110,
              borderRadius: 28,
              overflow: "hidden",
              boxShadow: "0 10px 28px rgba(255, 135, 93, 0.35)",
            }}
          >
            {/* The actual icon file, embedded as a data URI (see
                lib/brandIcon.js) — already has the peach gradient and
                emoji baked in together as one image, so no separate
                colored badge background is needed here anymore. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON_DATA_URI} width={110} height={110} style={{ objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -4.8 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
            {/* Deepened from the site's usual #ff875d — that reads fine on
                a white/near-white surface, but sits too close in hue and
                lightness to this darker peach background to stay readable */}
            <span style={{ color: "#b8532f" }}>Drop</span>
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
