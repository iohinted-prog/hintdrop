import { ImageResponse } from "next/og";
import { createClient } from "../../../lib/supabase/server";

export const alt = "You're invited to join a Circle on HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (next/og's renderer) has no access to the browser/OS font stack a
// real page gets — without explicitly loading one, it falls back to its
// own generic sans-serif, which looks nothing like the app's actual Arial.
// Arial itself isn't freely redistributable, so this loads Arimo — an
// open-source, metrically-compatible substitute purpose-built for exactly
// this situation — at request time via Google Fonts' CSS endpoint (the
// standard documented pattern for next/og custom fonts).
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
  const iconUrl = "https://hintdrop.app/favicon.png";

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
              background: "linear-gradient(180deg, #ffa47f, #ff875d)",
              boxShadow: "0 6px 16px rgba(255, 135, 93, 0.35)",
            }}
          >
            {/* The actual site icon file, not a text emoji character or a
                Twemoji CDN fetch — both are extra points of failure at
                render time, this is guaranteed pixel-identical to the rest
                of the site since it's literally the same file. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={iconUrl} width={48} height={48} style={{ objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1.6 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
            {/* Deepened from the site's usual #ff875d — that reads fine on
                a white/near-white surface, but sits too close in hue and
                lightness to this darker peach background to stay readable */}
            <span style={{ color: "#b8532f" }}>Drop</span>
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
