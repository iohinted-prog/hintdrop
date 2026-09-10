import { Modal, View, Pressable, StyleSheet } from "react-native";
import Text from "./Text";
import { colors, radii, spacing, shadow } from "../lib/theme";

// Replaces Alert.alert for menu-style choices (the board 3-dot menu,
// etc.) - Alert.alert renders as a plain OS system sheet (default
// system font, generic gray buttons), nothing like web's rounded
// white card with its own button styling. This is a real custom
// component matching that look: a white rounded card sliding up from
// the bottom, each option a full-width row, destructive options in
// the error color, a separate cancel row.
export default function ActionSheet({ visible, onClose, title, options }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {options.map((opt, i) => (
              <Pressable
                key={opt.label}
                style={[styles.row, i === options.length - 1 && styles.rowLast]}
                onPress={() => {
                  onClose();
                  opt.onPress?.();
                }}
              >
                <Text style={[styles.rowText, opt.destructive && styles.rowTextDestructive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(42,26,20,0.38)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadow,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderAlt,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  rowTextDestructive: {
    color: colors.errorText,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingVertical: 16,
    ...shadow,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
});
