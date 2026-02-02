import { StyleSheet, Text, View } from 'react-native';
import { MacroTargets, formatMacroValue, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface RecipeMacrosSummaryProps {
  macros: MacroTargets;
}

export default function RecipeMacrosSummary({ macros }: RecipeMacrosSummaryProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Macros per serving</Text>
      <View style={styles.macroGrid}>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Calories</Text>
          <Text style={styles.macroValue}>
            {formatMacroValue(macros.calories, 'calories')}
          </Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroValue}>
            {formatMacroValue(macros.protein, 'grams')}
          </Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroValue}>
            {formatMacroValue(macros.carbs, 'grams')}
          </Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroLabel}>Fat</Text>
          <Text style={styles.macroValue}>
            {formatMacroValue(macros.fat, 'grams')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.primary,
    marginBottom: spacing.md,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  macroCard: {
    flexBasis: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginBottom: spacing.xs,
  },
  macroValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.primary,
  },
});
