import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  FoodItem,
  RecipeIngredient,
  calculateRecipePerServingMacros,
  createEmptyMacros,
  formatMacroValue,
  spacing,
  fontSize,
  fontColor,
  colors,
} from '@meal-planning/shared';
import { getRecentFoods, getRecipeRepository } from '../storage';
import { mobileRepositoryContext } from '../storage/adapters/RepositoryContext';
import { NumberEditor } from '../components/NumberEditor';

const MAX_RECENT_FOODS = 50;

export default function RecipeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [foodPickerVisible, setFoodPickerVisible] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantityEditorVisible, setQuantityEditorVisible] = useState(false);

  const servingsValue = useMemo(() => {
    const parsed = parseFloat(servings);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [servings]);

  const perServingMacros = useMemo(() => {
    if (ingredients.length === 0) {
      return createEmptyMacros();
    }
    return calculateRecipePerServingMacros(ingredients, servingsValue);
  }, [ingredients, servingsValue]);

  const loadRecentFoods = useCallback(async () => {
    setIsLoadingFoods(true);
    try {
      const foods = await getRecentFoods(MAX_RECENT_FOODS);
      const deduped: FoodItem[] = [];
      const seen = new Set<string>();
      for (const item of foods) {
        if (!seen.has(item.food.id)) {
          seen.add(item.food.id);
          deduped.push(item.food);
        }
      }
      setRecentFoods(deduped);
    } catch (error) {
      console.error('Error loading recent foods:', error);
    } finally {
      setIsLoadingFoods(false);
    }
  }, []);

  useEffect(() => {
    loadRecentFoods();
  }, [loadRecentFoods]);

  const filteredFoods = useMemo(() => {
    const query = foodSearch.trim().toLowerCase();
    if (!query) return recentFoods;
    return recentFoods.filter((food) => {
      return (
        food.name.toLowerCase().includes(query) ||
        (food.brand && food.brand.toLowerCase().includes(query))
      );
    });
  }, [recentFoods, foodSearch]);

  const handleOpenFoodPicker = () => {
    setFoodSearch('');
    setFoodPickerVisible(true);
    loadRecentFoods();
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setFoodPickerVisible(false);
    setQuantityEditorVisible(true);
  };

  const handleAddIngredient = (quantity: number) => {
    if (!selectedFood) return;

    setIngredients((prev) => {
      const existingIndex = prev.findIndex((ing) => ing.foodId === selectedFood.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + quantity,
          addedAt: new Date(),
        };
        return updated;
      }
      return [
        ...prev,
        {
          foodId: selectedFood.id,
          food: selectedFood,
          quantity,
          addedAt: new Date(),
        },
      ];
    });
    setSelectedFood(null);
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.foodId !== ingredientId));
  };

  const handleSaveRecipe = async () => {
    if (isSaving) return;

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a recipe name.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Add ingredients', 'Please add at least one ingredient.');
      return;
    }
    if (!Number.isFinite(servingsValue) || servingsValue <= 0) {
      Alert.alert('Invalid servings', 'Please enter a valid serving count.');
      return;
    }

    setIsSaving(true);
    try {
      const recipeId = mobileRepositoryContext.generateId();
      await getRecipeRepository().save({
        id: recipeId,
        name: name.trim(),
        description: description.trim() || undefined,
        ingredients,
        servings: servingsValue,
        macros: createEmptyMacros(),
      });

      Alert.alert('Recipe saved', `"${name.trim()}" is ready to use.`);
      setName('');
      setDescription('');
      setServings('1');
      setIngredients([]);
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Save failed', 'Unable to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 140 },
        ]}
      >
        <Text style={styles.title}>Make Recipe</Text>
        <Text style={styles.subtitle}>
          Combine your foods into reusable recipes for quick logging.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Recipe name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Chicken Stir Fry"
            placeholderTextColor={fontColor.tertiary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes or steps"
            placeholderTextColor={fontColor.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Servings *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={servings}
            onChangeText={setServings}
            placeholder="1"
            placeholderTextColor={fontColor.tertiary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenFoodPicker}>
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
                    onPress={() => handleRemoveIngredient(ingredient.foodId)}
                  >
                    <Ionicons name="trash-outline" size={18} color={fontColor.tertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macros per serving</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(perServingMacros.calories, 'calories')}
              </Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(perServingMacros.protein, 'grams')}
              </Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(perServingMacros.carbs, 'grams')}
              </Text>
            </View>
            <View style={styles.macroCard}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {formatMacroValue(perServingMacros.fat, 'grams')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xl }]}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveRecipe}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={fontColor.inverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save Recipe</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={foodPickerVisible}
        animationType="slide"
        onRequestClose={() => setFoodPickerVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setFoodPickerVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={26} color={fontColor.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select ingredient</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={fontColor.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recent foods"
              placeholderTextColor={fontColor.tertiary}
              value={foodSearch}
              onChangeText={setFoodSearch}
            />
          </View>

          {isLoadingFoods ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredFoods.length === 0 ? (
            <View style={styles.emptyFoods}>
              <Ionicons name="time-outline" size={32} color={fontColor.tertiary} />
              <Text style={styles.emptyTitle}>No recent foods</Text>
              <Text style={styles.emptySubtitle}>
                Add foods from the Add Food tab to build recipes here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.foodList}>
              {filteredFoods.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.foodItem}
                  onPress={() => handleSelectFood(food)}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
                    <Text style={styles.foodMacros}>
                      {Math.round(food.macros.calories)} cal • {food.macros.protein}g P •{' '}
                      {food.macros.carbs}g C • {food.macros.fat}g F
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <NumberEditor
        visible={quantityEditorVisible}
        value={1}
        min={0.1}
        max={999}
        title="Quantity"
        unit="servings"
        keyboardType="numeric"
        hideRange={true}
        onSave={handleAddIngredient}
        onCancel={() => {
          setQuantityEditorVisible(false);
          setSelectedFood(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    color: fontColor.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.primary,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: colors.background.secondary,
    color: fontColor.primary,
  },
  textArea: {
    minHeight: 90,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.secondary,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    color: fontColor.primary,
  },
  foodList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  foodInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: 2,
  },
  foodBrand: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginBottom: 2,
  },
  foodMacros: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFoods: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
