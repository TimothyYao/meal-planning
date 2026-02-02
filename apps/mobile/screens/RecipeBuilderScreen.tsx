import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FoodItem,
  RecipeIngredient,
  calculateRecipePerServingMacros,
  createEmptyMacros,
  spacing,
  fontSize,
  fontColor,
  colors,
} from '@meal-planning/shared';
import { getRecentFoods, getRecipeRepository } from '../storage';
import { mobileRepositoryContext } from '../storage/adapters/RepositoryContext';
import { NumberEditor } from '../components/NumberEditor';
import RecipeBasicsForm from '../components/recipes/RecipeBasicsForm';
import RecipeIngredientsSection from '../components/recipes/RecipeIngredientsSection';
import RecipeMacrosSummary from '../components/recipes/RecipeMacrosSummary';
import RecipeFoodPickerModal from '../components/recipes/RecipeFoodPickerModal';
import RecipeSaveBar from '../components/recipes/RecipeSaveBar';

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

        <RecipeBasicsForm
          name={name}
          description={description}
          servings={servings}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onServingsChange={setServings}
        />

        <RecipeIngredientsSection
          ingredients={ingredients}
          onAddIngredient={handleOpenFoodPicker}
          onRemoveIngredient={handleRemoveIngredient}
        />

        <RecipeMacrosSummary macros={perServingMacros} />
      </ScrollView>

      <RecipeSaveBar
        isSaving={isSaving}
        bottomInset={insets.bottom}
        onSave={handleSaveRecipe}
      />

      <RecipeFoodPickerModal
        visible={foodPickerVisible}
        foods={filteredFoods}
        isLoading={isLoadingFoods}
        searchQuery={foodSearch}
        onSearchChange={setFoodSearch}
        onSelectFood={handleSelectFood}
        onClose={() => setFoodPickerVisible(false)}
      />

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
});
