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
          background: "#fffaf7",
          backgroundImage: "radial-gradient(circle at 25% 25%, #ffe8dc 0%, #fffaf7 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: "50%",
            marginBottom: 36,
            border: "6px solid #f0dfd6",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            background: owner?.avatar_url ? "transparent" : "linear-gradient(160deg, #efcdbf, #bb8168)",
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
            color: "#e37b57",
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
            letterSpacing: -2,
            color: "#2d2d2d",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Join {ownerName}'s Circle
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(160deg, #ffb899, #ff8f6b)",
              fontSize: 24,
            }}
          >
            🎁
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
            <span style={{ color: "#2d2d2d" }}>Hint</span>
            <span style={{ color: "#ff8060" }}>Drop</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
