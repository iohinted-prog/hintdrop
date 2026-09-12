import { useState } from "react";
import { View, Image } from "react-native";
import Text from "./Text";

// React Native's plain <Image> has no built-in fallback at all - a
// dead URL (a retailer renamed/removed a product photo since a hint
// was saved, which is inevitable and ongoing, not a one-off bug)
// just renders blank, with nothing to indicate anything was ever
// there. Confirmed directly: a hint whose image genuinely 404s (the
// retailer restructured their product photos entirely - different
// filename, different CDN version, not just a stale cache) was
// reported as the hint "not showing" in feed/detail, and none of
// FeedScreen.js, ProfileScreen.js, GroupHintDetailScreen.js, or
// CircleScreen.js had any onError handling anywhere to catch this.
//
// This is the scalable fix - wherever a hint's image is rendered,
// use this instead of a bare <Image>, and a dead link degrades to a
// plain gift-box placeholder instead of a blank gap, regardless of
// which specific URL happens to break next.
export default function HintImage({ uri, style, resizeMode = "cover", fallbackIcon = "🎁" }) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: "#f1e3db", alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 28 }}>{fallbackIcon}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
