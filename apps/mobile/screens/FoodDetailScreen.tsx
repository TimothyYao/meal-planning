import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect, useIsFocused, NavigationProp } from '@react-navigation/native';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MealFood, spacing, fontSize, fontColor, colors, deserializeDailyLog } from '@meal-planning/shared';
import { saveFood, addFoodToDate, generateFoodId, getTodayDate, getLogForDate } from '../storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_LOGS_KEY } from '../storage/constants';
import { safeGoBack } from '../utils/navigation';
import FoodDetail from '../components/FoodDetail';

type FoodDetailRouteParams = {
  mealId: string;
  foodIndex: number;
  date: string; // YYYY-MM-DD format
  mealFood?: MealFood; // Optional: pass mealFood directly to avoid loading from log
};

type FoodDetailRouteProp = RouteProp<{ FoodDetail: FoodDetailRouteParams }, 'FoodDetail'>;

export default function FoodDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<FoodDetailRouteProp>();
  const { mealId, foodIndex, date, mealFood: passedMealFood } = route.params;
  
  // Use passed mealFood as primary source, only load if not provided
  const [mealFood, setMealFood] = useState<MealFood | null>(passedMealFood || null);
  const [loading, setLoading] = useState(!passedMealFood);
  const [isCopying, setIsCopying] = useState(false);
  const mealFoodRef = useRef<MealFood | null>(passedMealFood || null);

  // Keep ref in sync with state
  useEffect(() => {
    mealFoodRef.current = mealFood;
  }, [mealFood]);

  // Function to load mealFood from log entry
  const loadMealFoodFromLog = useCallback(async () => {
    try {
      console.log('[FoodDetailScreen] Loading mealFood from log', { date, mealId, foodIndex });
      
      // Force a fresh read from AsyncStorage by reading directly
      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
      const log = logs[date];
      
      if (log) {
        // Deserialize the log
        const dailyLog = deserializeDailyLog(log);
        
        const meal = dailyLog.meals.find(m => m.id === mealId);
        if (meal && meal.foods[foodIndex]) {
          const loadedMealFood = meal.foods[foodIndex];
          console.log('[FoodDetailScreen] Found mealFood:', loadedMealFood.food.name, 'quantity:', loadedMealFood.quantity);
          setMealFood(loadedMealFood);
          return loadedMealFood;
        } else {
          console.warn('[FoodDetailScreen] Meal or food not found', { mealFound: !!meal, foodIndex, foodsLength: meal?.foods?.length });
        }
      } else {
        console.warn('[FoodDetailScreen] Log not found for date:', date);
        // Fallback to getLogForDate
        const logFromFunction = await getLogForDate(date);
        if (logFromFunction) {
          const meal = logFromFunction.meals.find(m => m.id === mealId);
          if (meal && meal.foods[foodIndex]) {
            const loadedMealFood = meal.foods[foodIndex];
            setMealFood(loadedMealFood);
            return loadedMealFood;
          }
        }
      }
    } catch (error) {
      console.error('[FoodDetailScreen] Error loading mealFood from log:', error);
    }
    return null;
  }, [date, mealId, foodIndex]);

  // Update mealFood when route params change (initial load)
  useEffect(() => {
    if (passedMealFood) {
      setMealFood(passedMealFood);
      mealFoodRef.current = passedMealFood;
      setLoading(false);
    }
  }, [passedMealFood]);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);
  
  // Load mealFood from log entry whenever screen is focused
  // Always reload to ensure we have latest data (especially after editing)
  useFocusEffect(
    useCallback(() => {
      const reload = async () => {
        // On initial load, show loading if we don't have data
        if (isInitialLoadRef.current && !mealFoodRef.current) {
          setLoading(true);
        }
        
        // Always reload to get the latest data
        // This ensures we get updates after editing, even if focus didn't change
        console.log('[FoodDetailScreen] useFocusEffect triggered, reloading mealFood');
        const updatedMealFood = await loadMealFoodFromLog();
        if (updatedMealFood) {
          setMealFood(updatedMealFood);
        }
        
        setLoading(false);
        isInitialLoadRef.current = false;
      };
      
      // Small delay to ensure any save operations complete
      setTimeout(() => {
        reload();
      }, 200);
    }, [loadMealFoodFromLog]) // Don't include mealFood to avoid stale closures
  );

  // Track previous navigation state to detect when EditFood closes
  const prevHasEditFoodRef = useRef(false);
  
  // Listen for navigation state changes to detect when EditFood closes
  // This works even when the screen doesn't lose/regain focus (modal behavior)
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      try {
        const state = e.data.state;
        const routes = state?.routes || [];
        const currentRoute = routes[routes.length - 1];
        const hasEditFood = routes.some((r: any) => r.name === 'EditFood');
        const isFoodDetail = currentRoute?.name === 'FoodDetail';
        
        // If EditFood was open and now it's closed, and we're on FoodDetail, reload
        if (prevHasEditFoodRef.current && !hasEditFood && isFoodDetail) {
          console.log('[FoodDetailScreen] EditFood closed (detected via navigation state), reloading mealFood');
          setTimeout(() => {
            loadMealFoodFromLog();
          }, 200);
        }
        
        prevHasEditFoodRef.current = hasEditFood;
      } catch (error) {
        console.error('[FoodDetailScreen] Error in navigation state listener:', error);
      }
    });

    return unsubscribe;
  }, [navigation, loadMealFoodFromLog]);


  const handleEdit = () => {
    if (!mealFood) return;
    try {
      // Navigate to EditFood screen with all necessary parameters
      (navigation as any).navigate('EditFood', { 
        foodId: mealFood.food.id,
        mealId,
        foodIndex,
        date,
        quantity: mealFood.quantity,
      });
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: try using push
      (navigation as any).push('EditFood', { 
        foodId: mealFood.food.id,
        mealId,
        foodIndex,
        date,
        quantity: mealFood.quantity,
      });
    }
  };

  const handleDuplicate = async () => {
    if (!mealFood || isCopying) return;
    
    setIsCopying(true);
    try {
      const food = mealFood.food;
      console.log('Starting copy operation for food:', food.name);
      
      // Create a copy of the food item with a new UUID
      const newId = await generateFoodId();
      const copiedFood = {
        ...food,
        id: newId,
      };
      
      console.log('Created copied food with new ID:', newId);

      // Save the copied food to the database (cache first, then Firebase)
      await saveFood(copiedFood);
      console.log('Saved copied food to cache');

      // Add to today's log with the same quantity
      const targetDate = getTodayDate();
      await addFoodToDate(copiedFood, mealFood.quantity, targetDate);
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

  if (loading || !mealFood) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FoodDetail 
        food={mealFood.food} 
        quantity={mealFood.quantity} 
        addedAt={mealFood.addedAt}
      />

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.navTile} onPress={handleEdit} activeOpacity={0.7}>
          <View style={styles.tileIconContainer}>
            <Ionicons name="pencil" size={24} color={colors.primary} />
          </View>
          <Text style={styles.tileText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navTile, (isCopying || !mealFood) && styles.navTileDisabled]} 
          onPress={handleDuplicate}
          activeOpacity={0.7}
          disabled={isCopying || !mealFood}
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
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
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
