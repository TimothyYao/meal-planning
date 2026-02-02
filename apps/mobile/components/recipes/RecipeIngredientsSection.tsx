import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeIngredient, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface RecipeIngredientsSectionProps {
  ingredients: RecipeIngredient[];
  onAddIngredient: () => void;
  onRemoveIngredient: (ingredientId: string) => void;
}

export default function RecipeIngredientsSection({
  ingredients,
  onAddIngredient,
  onRemoveIngredient,
}: RecipeIngredientsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddIngredient}
          testID="add-ingredient"
        >
          <Ionicons name="add" size={18} color={fontColor.inverse} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {ingredients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={32} color={fontColor.tertiary} />
          <Text style={styles.emptyTitle}>No ingredients yet</Text>
          <Text style={styles.emptySubtitle}>
            Add foods you have logged recently to build this recipe.
          </Text>
        </View>
      ) : (
        <View style={styles.ingredientList}>
          {ingredients.map((ingredient) => (
            <View key={ingredient.foodId} style={styles.ingredientRow}>
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName}>{ingredient.food.name}</Text>
                <Text style={styles.ingredientMeta}>
                  {ingredient.quantity} x {ingredient.food.servingSize} {ingredient.food.servingUnit}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveIngredient(ingredient.foodId)}
                testID={`remove-ingredient-${ingredient.foodId}`}
              >
                <Ionicons name="trash-outline" size={18} color={fontColor.tertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: {
    color: fontColor.inverse,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  ingredientList: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  ingredientInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  ingredientName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
  },
  ingredientMeta: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginTop: spacing.xs,
  },
  removeButton: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.secondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
