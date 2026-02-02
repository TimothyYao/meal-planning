import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface RecipeSaveBarProps {
  isSaving: boolean;
  bottomInset: number;
  onSave: () => void;
}

export default function RecipeSaveBar({ isSaving, bottomInset, onSave }: RecipeSaveBarProps) {
  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomInset + spacing.xl }]}>
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={fontColor.inverse} />
        ) : (
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: fontColor.inverse,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
