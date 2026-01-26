import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodItem, formatMacroValue, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface FoodDetailProps {
  food: FoodItem;
  quantity: number;
  addedAt?: Date;
}

export default function FoodDetail({ food, quantity, addedAt }: FoodDetailProps) {
  const insets = useSafeAreaInsets();
  const formatNumber = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  };

  const formatServingSize = (size: number, unit: string) => {
    const sizeText = formatNumber(size);
    return unit ? `${sizeText} ${unit}` : sizeText;
  };

  const formatTime = (date: Date | undefined) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateCaloriesFromMacros = (macros: { protein: number; carbs: number; fat: number }) => {
    return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  };

  // Calculate totals
  const totalCalories = calculateCaloriesFromMacros(food.macros) * quantity;
  const totalProtein = food.macros.protein * quantity;
  const totalCarbs = food.macros.carbs * quantity;
  const totalFat = food.macros.fat * quantity;

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content, 
        { 
          paddingTop: insets.top + 20,
          paddingBottom: 100 + insets.bottom,
        }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{food.name}</Text>
        {quantity !== 1 && (
          <Text style={styles.quantity}>{formatNumber(quantity)} servings</Text>
        )}
        {addedAt && (
          <Text style={styles.addedTime}>
            {formatTime(addedAt)}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serving Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Serving Size</Text>
          <Text style={styles.infoValue}>
            {formatServingSize(food.servingSize, food.servingUnit)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Number of Servings</Text>
          <Text style={styles.infoValue}>{formatNumber(quantity)}</Text>
        </View>
        {quantity !== 1 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount</Text>
            <Text style={styles.infoValue}>
              {formatServingSize(food.servingSize * quantity, food.servingUnit)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros (per serving)</Text>
        <View style={styles.macroCard}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Calories</Text>
            <Text style={styles.macroValue}>
              {formatMacroValue(calculateCaloriesFromMacros(food.macros), 'calories')}
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>
              {formatMacroValue(food.macros.protein, 'grams')}
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>
              {formatMacroValue(food.macros.carbs, 'grams')}
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>
              {formatMacroValue(food.macros.fat, 'grams')}
            </Text>
          </View>
        </View>
      </View>

      {quantity !== 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Macros ({formatNumber(quantity)} servings)</Text>
          <View style={styles.macroCard}>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(totalCalories, 'calories')}
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(totalProtein, 'grams')}
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(totalCarbs, 'grams')}
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(totalFat, 'grams')}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  quantity: {
    fontSize: fontSize.lg,
    color: fontColor.tertiary,
  },
  addedTime: {
    fontSize: fontSize.sm,
    color: fontColor.quaternary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.secondary,
  },
  macroCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
  },
  macroValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.primary,
  },
});
