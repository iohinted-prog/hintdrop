import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Text from "./Text";
import { colors } from "../lib/theme";

// Mirrors the mobile bottom nav in app/components/AppShell.jsx
// exactly (the <nav className="fixed bottom-0 ... flex lg:hidden">
// block - web's own desktop nav in the header is a completely
// different, hidden-on-mobile element, not what this matches). Same
// 5 items, same order, same active/inactive colors, same raised
// coral gift-box button for Hints, and critically the same label for
// the Feed tab - it says "Home" on web's bottom nav, not "Feed".
const TAB_CONFIG = {
  Feed: { label: "Home", icon: "home" },
  Circle: { label: "Circle", icon: "users" },
  Hints: { label: "Hints", icon: null }, // special raised button, no plain icon
  Calendar: { label: "Calendar", icon: "calendar" },
  Shop: { label: "Shop", icon: "shopping-bag" },
};

export default function BottomNav({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const config = TAB_CONFIG[route.name];
        if (!config) return null;
        const isFocused = state.index === index;

        function onPress() {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        if (route.name === "Hints") {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.hintsTab}>
              <View style={[styles.hintsButton, isFocused && styles.hintsButtonActive]}>
                <Feather name="gift" size={24} color="#fff" />
              </View>
              <Text style={[styles.label, { marginTop: 2 }, isFocused ? styles.labelActive : styles.labelInactive]}>{config.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Feather name={config.icon} size={22} color={isFocused ? colors.coral : colors.textMuted} />
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>{config.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(255,250,247,0.97)",
    paddingTop: 8,
  },
  tab: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintsTab: {
    alignItems: "center",
    marginTop: -22,
  },
  hintsButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.coral,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  hintsButtonActive: {
    borderWidth: 2,
    borderColor: colors.coral,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.coral,
  },
  labelInactive: {
    color: colors.textMuted,
  },
});
