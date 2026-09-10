import { Text as RNText, StyleSheet } from "react-native";
import { fonts } from "./theme";

// Existing screens (HintsScreen.js, FeedScreen.js) were written with
// plain fontWeight: "700"/"600" style values, relying on the OS
// system font's built-in weight variants - which is exactly why
// loading Inter alone didn't change anything visually. Custom fonts
// in React Native don't respond to fontWeight the way system fonts
// do; each weight needs its own explicit fontFamily name. Rather
// than rewriting every style object across thousands of lines, this
// wrapper inspects the resolved style's fontWeight and injects the
// matching Inter fontFamily automatically, so existing "700"/"600"/
// default styles pick up the right weight with no call-site changes
// - only the Text import needs swapping to this file.
function weightToFamily(weight) {
  const w = String(weight || "400");
  if (w === "700" || w === "bold") return fonts.bold;
  if (w === "600") return fonts.semibold;
  return fonts.regular;
}

export default function Text({ style, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const fontFamily = flat.fontFamily || weightToFamily(flat.fontWeight);
  return <RNText {...props} style={[style, { fontFamily }]} />;
}
