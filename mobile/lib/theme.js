// Design tokens pulled directly from the web app's actual Tailwind
// classes (app/components/AppShell.jsx, app/hints/[boardId]/
// HintsClient.jsx, and related components) - not approximated from
// memory. Every new mobile screen should reference these rather than
// hardcoding its own colors/radii/spacing, so visual fidelity to the
// website is a property of the system, not something re-verified
// component by component.

export const colors = {
  // Primary coral gradient (buttons, active states) - from-[#ff966f] to-[#ff7e54]
  coralGradientFrom: "#ff966f",
  coralGradientTo: "#ff7e54",
  // Solid brand coral (icons, accents, splash background)
  coral: "#ff875d",
  coralDeep: "#df7b59",
  coralMuted: "#f19a78",
  coralPale: "#efc4b2",
  // Warm off-white backgrounds
  bg: "#fffaf7",
  bgAlt: "#fcfaf8",
  card: "#ffffff",
  // Borders / hairlines
  border: "#ead8ce",
  borderAlt: "#eadcd3",
  // Text
  textPrimary: "#0f172a", // slate-900
  textSecondary: "#64748b", // slate-500
  textMuted: "#94a3b8", // slate-400
  // Success (accepted collaborator, confirmations)
  successBg: "#e3f5ea",
  successBorder: "#bfe4cf",
  successText: "#2f8a5f",
  // Error
  errorBg: "#fff4f2",
  errorBorder: "#efc0ba",
  errorText: "#b14f43",
  // Sand gradient - non-user avatar fallback only (matches
  // lib/avatarColor.js's NON_USER_AVATAR_COLOR on web)
  sandFrom: "#efcdbf",
  sandTo: "#bb8168",
};

// Web uses arbitrary-value rounding (rounded-[Npx]) rather than a
// fixed scale, but these are the values that actually recur across
// the app's real components.
export const radii = {
  pill: 999, // buttons, chips
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  card: 20, // the most common "card" radius (hint cards, list rows)
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// Web's sitewide font is Inter (400/600/700 weights - see
// app/layout.js). Loaded via @expo-google-fonts/inter in App.js;
// these are the exact family names that font package registers under
// Font.loadAsync, for use in fontFamily style props.
export const fonts = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

// Shared shadow, matching the soft warm shadow used on web cards
// (shadow-sm / shadow-md classes resolve to something like this).
export const shadow = {
  shadowColor: "#582e1f",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3, // Android
};
