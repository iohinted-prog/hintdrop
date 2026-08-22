import { ImageResponse } from "next/og";
import { createClient } from "../../../lib/supabase/server";

export const alt = "You're invited to join a Circle on HintDrop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          // A clearly peach background throughout, not just a subtle
          // corner accent on an off-white base
          background: "linear-gradient(160deg, #ffe4d3 0%, #ffd9c2 55%, #ffcdae 100%)",
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
            <img src={owner.avatar_url} width={160} height={160} style={{ objectFit: "cover" }} alt="" />
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
          <div style={{ display: "flex", fontSize: 40 }}>🎁</div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1.6 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
            <span style={{ color: "#ff875d" }}>Drop</span>
          </div>
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
