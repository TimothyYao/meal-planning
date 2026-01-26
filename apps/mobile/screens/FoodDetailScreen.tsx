import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, formatMacroValue, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { saveFood, addFoodToDate, generateFoodId, getFoodById, getTodayDate } from '../storage';
import { safeGoBack } from '../utils/navigation';

type FoodDetailRouteParams = {
  foodId: string;
  quantity?: number;
  addedAt?: string; // ISO string
  mealId?: string;
  foodIndex?: number;
  date?: string; // YYYY-MM-DD format
};

type FoodDetailRouteProp = RouteProp<{ FoodDetail: FoodDetailRouteParams }, 'FoodDetail'>;

export default function FoodDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<FoodDetailRouteProp>();
  const { foodId, quantity: initialQuantity = 1, addedAt: addedAtString, mealId, foodIndex, date } = route.params;
  const [food, setFood] = useState<FoodItem | null>(null);
  const [quantity] = useState(initialQuantity);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const addedAt = addedAtString ? new Date(addedAtString) : undefined;

  // Load food data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadFood = async () => {
        setLoading(true);
        const loadedFood = await getFoodById(foodId);
        if (loadedFood) {
          setFood(loadedFood);
        }
        setLoading(false);
      };
      loadFood();
    }, [foodId])
  );

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

  const handleEdit = () => {
    if (!food) return;
    try {
      // Navigate to EditFood screen with all necessary parameters
      (navigation as any).navigate('EditFood', { 
        foodId: food.id,
        mealId,
        foodIndex,
        date,
        quantity: initialQuantity,
      });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: try using push
      (navigation as any).push('EditFood', { 
        foodId: food.id,
        mealId,
        foodIndex,
        date,
        quantity: initialQuantity,
      });
    }
  };

  const handleDuplicate = async () => {
    if (!food || isCopying) return;
    
    setIsCopying(true);
    try {
      console.log('Starting copy operation for food:', food.name);
      
      // Create a copy of the food item with a new UUID
      const newId = await generateFoodId();
      const copiedFood: FoodItem = {
        ...food,
        id: newId,
      };
      
      console.log('Created copied food with new ID:', newId);

      // Save the copied food to the database (cache first, then Firebase)
      await saveFood(copiedFood);
      console.log('Saved copied food to cache');

      // Add to the date's log (use the date from route params, or today if not available)
      const targetDate = date || getTodayDate();
      await addFoodToDate(copiedFood, quantity, targetDate);
      console.log(`Added copied food to ${targetDate}'s log`);

      Alert.alert('Success', `Copied ${food.name} and added to today's log`, [
        {
          text: 'OK',
          onPress: () => {
            safeGoBack(navigation);
          },
        },
      ]);
    } catch (error) {
      console.error('Error copying food:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to copy food: ${errorMessage}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleBack = () => {
    safeGoBack(navigation);
  };

  if (loading || !food) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Calculate totals only when food is loaded
  const totalCalories = calculateCaloriesFromMacros(food.macros) * quantity;
  const totalProtein = food.macros.protein * quantity;
  const totalCarbs = food.macros.carbs * quantity;
  const totalFat = food.macros.fat * quantity;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content, 
          { 
            paddingTop: insets.top + 20,
            paddingBottom: 100 + insets.bottom, // Space for bottom buttons
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

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.navTile} onPress={handleEdit} activeOpacity={0.7}>
          <View style={styles.tileIconContainer}>
            <Ionicons name="pencil" size={24} color={colors.primary} />
          </View>
          <Text style={styles.tileText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navTile, (isCopying || !food) && styles.navTileDisabled]} 
          onPress={() => {
            console.log('Copy button pressed, food:', food?.name, 'isCopying:', isCopying);
            handleDuplicate();
          }} 
          activeOpacity={0.7}
          disabled={isCopying || !food}
        >
          <View style={styles.tileIconContainer}>
            {isCopying ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="copy" size={24} color={colors.primary} />
            )}
          </View>
          <Text style={styles.tileText}>{isCopying ? 'Copying...' : 'Copy'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTile} onPress={handleBack} activeOpacity={0.7}>
          <View style={styles.tileIconContainer}>
            <Ionicons name="arrow-back" size={24} color={fontColor.tertiary} />
          </View>
          <Text style={[styles.tileText, styles.tileTextSecondary]}>Back</Text>
        </TouchableOpacity>
      </View>
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
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing.md,
    shadowColor: colors.background.inverse,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 80,
  },
  navTileDisabled: {
    opacity: 0.6,
  },
  tileIconContainer: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  tileTextSecondary: {
    color: fontColor.tertiary,
  },
});
