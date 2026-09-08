import { View, Text, StyleSheet } from "react-native";

// Genuinely a placeholder, not pretending otherwise - each of these
// needs the same treatment FeedScreen.js got (real Supabase queries,
// real UI matching the web app's design). Kept as a named function
// per screen (rather than one generic component) so each file is
// the obvious place to build out that screen for real.
function ComingSoon({ label }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎁</Text>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.subtitle}>Coming soon.</Text>
    </View>
  );
}

export function CircleScreen() {
  return <ComingSoon label="Circle" />;
}

export function HintsScreen() {
  return <ComingSoon label="Hints" />;
}

export function CalendarScreen() {
  return <ComingSoon label="Calendar" />;
}

export function ShopScreen() {
  return <ComingSoon label="Shop" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffaf7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
