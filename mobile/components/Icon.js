import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";

// Hand-drawn SVG replacements for the handful of Feather icons used
// across the app (bell, filter, message-square, home, users,
// calendar, shopping-bag), built with react-native-svg instead of
// @expo/vector-icons.
//
// Why: vector icons via @expo/vector-icons render as font glyphs,
// which depend on the icon font being loaded natively at runtime.
// That's stayed broken across several rounds of fixes on this
// project - ruled out invalid icon names, import typos, missing
// Metro asset config, and explicitly preloaded the font via useFonts
// (mirroring the fix that worked for Inter) - none of it resolved
// it, while unrelated native-module issues (expo-linear-gradient)
// did get fixed by a rebuild in the same window. That pattern points
// at something specific to font-glyph icon loading in this project,
// not a general "needs a rebuild" issue. SVG icons render as actual
// vector paths through a completely different mechanism (no font
// asset, no font loading step at all), so this sidesteps the broken
// mechanism entirely rather than attempting another fix aimed at it.
//
// Paths match Feather's exact icon set (24x24 viewBox, stroke-based,
// round caps/joins, strokeWidth 2) - same visual result as before,
// different rendering path. bell/filter/message-square paths are the
// exact ones already confirmed correct from web's own inline SVG
// icons (AppShell.jsx, ProfileClient.jsx) rather than approximated.
const ICONS = {
  bell: (
    <>
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  filter: <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  "message-square": <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  home: (
    <>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  users: (
    <>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  circle: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="12" r="4" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  "shopping-bag": (
    <>
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
};

export default function Icon({ name, size = 20, color = "#475569" }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {content}
    </Svg>
  );
}
