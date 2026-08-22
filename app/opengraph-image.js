import { ImageResponse } from "next/og";

export const alt = "HintDrop — Never forget. Always thoughtful.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "linear-gradient(160deg, #ffe4d3 0%, #ffd9c2 55%, #ffcdae 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div style={{ display: "flex", fontSize: 96 }}>🎁</div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -4.8 }}>
            <span style={{ color: "#0f172a" }}>Hint</span>
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
    { ...size, emoji: "twemoji" }
  );
}
