import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { createClient } from "../../../lib/supabase/server";
import { BRAND_ICON_WHITE_DATA_URI } from "../../../lib/brandIcon";

export const alt = "You're invited to join a Circle on HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Needed for fs access to the bundled font files below — see the same
// fix and explanation in app/opengraph-image.js. This file previously
// fetched a Google Font live on every request; that failed in
// production ("Could not find a TTF font URL in the Google Fonts CSS
// response") because it was requesting an unavailable weight. Bundling
// the real files removes the live network dependency and the
// possibility of requesting a nonexistent weight entirely. Later
// swapped the bundled font from Arimo to Inter to match the sitewide
// font choice.
export const runtime = "nodejs";

const inter600 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-600.ttf"));
const inter700 = fs.readFileSync(path.join(process.cwd(), "lib/fonts/inter-700.ttf"));

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
    { name: "Inter", data: inter600, weight: 600, style: "normal" },
    { name: "Inter", data: inter700, weight: 700, style: "normal" },
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
          fontFamily: "Inter",
          // Coral background with cream writing, matching the app's
          // brand treatment elsewhere (the WhatsApp share button, the
          // full logo) rather than the site's usual pearly page
          // background - this card is meant to stand out as an invite,
          // not blend in as a regular page.
          background: "linear-gradient(160deg, #ff966f, #ff7e54)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: "50%",
            marginBottom: 36,
            border: "6px solid #fffaf3",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            background: owner?.avatar_url ? "transparent" : "linear-gradient(160deg, #efcdbf, #bb8168)",
            boxShadow: "0 12px 32px rgba(88, 46, 31, 0.22)",
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
            // fontWeight 700 - the heaviest bundled here.
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
            color: "#fffaf3",
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
            color: "#fffaf3",
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
              boxShadow: "0 6px 16px rgba(88, 46, 31, 0.25)",
            }}
          >
            {/* The current icon (see lib/brandIcon.js). objectFit set to
                contain rather than cover: the icon isn't square (its
                current source is 1772x1971), and cover would crop it
                inside this fixed 48x48 container. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON_WHITE_DATA_URI} width={48} height={48} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: -1.6, color: "#fffaf3" }}>
            HintDrop
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
