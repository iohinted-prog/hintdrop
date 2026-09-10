import { Modal, View, Pressable, StyleSheet } from "react-native";
import Text from "./Text";
import { colors, radii, shadow } from "../lib/theme";

// Mirrors web's header account dropdown (app/components/AppShell.jsx
// - the menuOpen block: name/email header, then Profile/Settings/
// Account links). Previously the avatar button skipped straight to
// AccountScreen with no menu at all - this restores the actual
// dropdown step web has, including Profile (their own public profile)
// and Settings (new - see SettingsScreen.js), not just Account.
export default function AccountMenu({ visible, onClose, fullName, email, onSelectProfile, onSelectSettings, onSelectAccount }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menu} onPress={() => {}}>
          <View style={styles.identityBox}>
            <Text style={styles.name} numberOfLines={1}>{fullName || "Your account"}</Text>
            <Text style={styles.email} numberOfLines={1}>{email || "Signed in"}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Pressable style={styles.item} onPress={() => { onClose(); onSelectProfile(); }}>
              <Text style={styles.itemText}>Profile</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => { onClose(); onSelectSettings(); }}>
              <Text style={styles.itemText}>Settings</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => { onClose(); onSelectAccount(); }}>
              <Text style={styles.itemText}>Account</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)" },
  menu: {
    position: "absolute",
    top: 90,
    right: 16,
    width: 220,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "#ead8ce",
    backgroundColor: "#fff",
    padding: 8,
    ...shadow,
    shadowOpacity: 0.18,
  },
  identityBox: { borderRadius: radii.lg, backgroundColor: "#fff8f4", paddingHorizontal: 12, paddingVertical: 12 },
  name: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  item: { borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10 },
  itemText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
});
