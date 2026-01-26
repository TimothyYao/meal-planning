import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, MealFood, Meal, calculateMacros, DailyLog, serializeDailyLog } from '@meal-planning/shared';
import { getCurrentUser } from '../utils/auth';
import {
  saveFoodToFirestore,
  getFoodsFromFirestore,
  getFoodByIdFromFirestore,
} from '../utils/firestore';
import { FOODS_KEY, DAILY_LOGS_KEY } from './constants';

/**
 * Save a food item to the food database and update all instances in daily logs
 * Writes to cache first, then Firebase (for better offline support)
 */
export async function saveFood(food: FoodItem): Promise<void> {
  try {
    // STEP 1: Save to local storage first (cache) for immediate availability
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    const foods: FoodItem[] = foodsJson ? JSON.parse(foodsJson) : [];
    
    // Check if food with same id already exists, update it
    const existingIndex = foods.findIndex(f => f.id === food.id);
    if (existingIndex >= 0) {
      foods[existingIndex] = food;
    } else {
      foods.push(food);
    }
    
    await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(foods));
    
    // STEP 2: Then save to Firestore (async, non-blocking)
    const user = getCurrentUser();
    if (user) {
      // Firestore save happens after cache, but we don't wait for it to complete
      // This ensures the UI is responsive even if Firestore is slow
      saveFoodToFirestore(food).catch((error) => {
        console.error('Error saving food to Firestore (will retry on sync):', error);
        // Food is already in cache, so it will sync later
      });
    }
    
    // Also update all instances of this food in daily logs
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    if (logsJson) {
      const logs: Record<string, any> = JSON.parse(logsJson);
      let anyLogsUpdated = false;
      
      // Iterate through all daily logs
      for (const date in logs) {
        const log = logs[date];
        if (log && log.meals && Array.isArray(log.meals)) {
          let dayUpdated = false;
          
          // Update food in all meals
          for (const meal of log.meals) {
            if (meal.foods && Array.isArray(meal.foods)) {
              let mealUpdated = false;
              
              // Update any MealFood entries that reference this food
              for (const mealFood of meal.foods) {
                if (mealFood.foodId === food.id || mealFood.food?.id === food.id) {
                  mealFood.food = food;
                  mealUpdated = true;
                  dayUpdated = true;
                }
              }
              
              // Recalculate meal macros if any foods were updated
              if (mealUpdated) {
                meal.macros = calculateMacros(meal.foods);
              }
            }
          }
          
          // Recalculate total macros for the day if any foods were updated
          if (dayUpdated) {
            const allMealFoods: MealFood[] = log.meals.flatMap((meal: Meal) => meal.foods || []);
            log.totalMacros = calculateMacros(allMealFoods);
            anyLogsUpdated = true;
          }
        }
      }
      
      // Save updated logs if any changes were made
      if (anyLogsUpdated) {
        // Convert Date objects to ISO strings for storage
        const logsToSave: Record<string, any> = {};
        for (const date in logs) {
          const log = logs[date] as DailyLog;
          logsToSave[date] = serializeDailyLog(log);
        }
        await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logsToSave));
      }
    }
  } catch (error) {
    console.error('Error saving food:', error);
    throw error;
  }
}

/**
 * Get all saved foods
 */
export async function getFoods(): Promise<FoodItem[]> {
  try {
    const user = getCurrentUser();
    
    // If authenticated, try to get from Firestore first (which caches locally)
    if (user) {
      try {
        const firestoreFoods = await getFoodsFromFirestore();
        if (firestoreFoods.length > 0) {
          return firestoreFoods;
        }
      } catch (error) {
        console.error('Error getting foods from Firestore, falling back to local:', error);
      }
    }
    
    // Fallback to local storage
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    return foodsJson ? JSON.parse(foodsJson) : [];
  } catch (error) {
    console.error('Error getting foods:', error);
    return [];
  }
}

/**
 * Get a food by ID
 */
export async function getFoodById(foodId: string): Promise<FoodItem | null> {
  try {
    const user = getCurrentUser();
    
    // If authenticated, try to get from Firestore first
    if (user) {
      try {
        const food = await getFoodByIdFromFirestore(foodId);
        if (food) return food;
      } catch (error) {
        console.error('Error getting food from Firestore, falling back to local:', error);
      }
    }
    
    // Fallback to local storage
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    if (!foodsJson) return null;
    const foods: FoodItem[] = JSON.parse(foodsJson);
    return foods.find(f => f.id === foodId) || null;
  } catch (error) {
    console.error('Error getting food by ID:', error);
    return null;
  }
}

/**
 * Delete a food item from the database
 * Also removes it from Firestore if authenticated
 */
export async function deleteFood(foodId: string): Promise<void> {
  try {
    // STEP 1: Remove from local storage
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    if (foodsJson) {
      const foods: FoodItem[] = JSON.parse(foodsJson);
      const filteredFoods = foods.filter(f => f.id !== foodId);
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(filteredFoods));
    }
    
    // STEP 2: Remove from Firestore (async, non-blocking)
    const user = getCurrentUser();
    if (user) {
      const { deleteFoodFromFirestore } = await import('../utils/firestore');
      deleteFoodFromFirestore(foodId).catch((error) => {
        console.error('Error deleting food from Firestore:', error);
      });
    }
  } catch (error) {
    console.error('Error deleting food:', error);
    throw error;
  }
}
