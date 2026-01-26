import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, MealFood, FoodItem, MacroTargets, calculateMacros, Meal, serializeDailyLog, deserializeDailyLog } from '@meal-planning/shared';
import { getCurrentUser } from '../utils/auth';
import {
  saveDailyLogToFirestore,
  getDailyLogFromFirestore,
  getUserProfileFromFirestore,
} from '../utils/firestore';
import { DAILY_LOGS_KEY, RECENT_FOODS_CACHE_KEY } from './constants';
import { generateFoodId, getTodayDate } from './utils';
import { getUserTargetMacros } from './macros';

/**
 * Compare two MacroTargets to see if they are different
 */
function areTargetsDifferent(target1: MacroTargets, target2: MacroTargets): boolean {
  return (
    target1.calories !== target2.calories ||
    target1.protein !== target2.protein ||
    target1.carbs !== target2.carbs ||
    target1.fat !== target2.fat
  );
}

/**
 * Asynchronously update daily log target macros from Firebase if different
 * This runs in the background and doesn't block the return value
 */
async function updateTargetMacrosFromFirebase(log: DailyLog): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;

    // Fetch target macros from Firebase asynchronously
    const profileData = await getUserProfileFromFirestore();
    if (profileData?.targetMacros) {
      const firebaseTargets = profileData.targetMacros;
      
      // Compare with current log targets
      if (areTargetsDifferent(log.targetMacros, firebaseTargets)) {
        console.log('[updateTargetMacrosFromFirebase] Target macros differ, updating log:', {
          date: log.date,
          current: log.targetMacros,
          firebase: firebaseTargets,
        });
        
        // Update the log with Firebase target macros
        log.targetMacros = firebaseTargets;
        
        // Save updated log to local storage
        const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
        const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
        const logToSave = serializeDailyLog(log);
        logs[log.date] = logToSave;
        await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
        
        // Also save to Firestore
        await saveDailyLogToFirestore(log);
        
        console.log('[updateTargetMacrosFromFirebase] Successfully updated target macros for', log.date);
      }
    }
  } catch (error) {
    console.error('[updateTargetMacrosFromFirebase] Error updating target macros from Firebase:', error);
    // Don't throw - this is a background operation
  }
}

/**
 * Add a food to a specific date's log
 */
export async function addFoodToDate(food: FoodItem, quantity: number = 1, date: string): Promise<void> {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    // Get or create the date's log
    let dateLog = logs[date];
    if (!dateLog) {
      // Use user profile targets instead of hardcoded defaults
      const targetMacros = await getUserTargetMacros();
      dateLog = {
        date: date,
        meals: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targetMacros: targetMacros,
      };
    }
    
    // Create a meal food entry
    const mealFood: MealFood = {
      foodId: food.id,
      food,
      quantity,
      addedAt: new Date(),
    };
    
    // Add to a default "Meal" or create a new meal
    // For simplicity, we'll add all foods to a single meal
    if (dateLog.meals.length === 0) {
      dateLog.meals.push({
        id: await generateFoodId(),
        name: 'Meal',
        foods: [mealFood],
        timestamp: new Date(),
        macros: calculateMacros([mealFood]),
      });
    } else {
      // Add to the first meal (or you could create separate meals)
      dateLog.meals[0].foods.push(mealFood);
      dateLog.meals[0].macros = calculateMacros(dateLog.meals[0].foods);
    }

    // Recalculate total macros for the day
    const allMealFoods: MealFood[] = dateLog.meals.flatMap((meal: Meal) => meal.foods);
    dateLog.totalMacros = calculateMacros(allMealFoods);

    // Convert Date objects to ISO strings for storage
    const logToSave = serializeDailyLog(dateLog as DailyLog);
    
    // Save updated log
    logs[date] = logToSave;
    await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    console.log(`[addFoodToDate] Saved log for ${date}, meals count:`, logToSave.meals.length, 
      'total foods:', logToSave.meals.reduce((sum: number, m: any) => sum + m.foods.length, 0));
    
    // Invalidate recent foods cache since we added a new food
    invalidateRecentFoodsCache().catch((error) => {
      console.error('Error invalidating recent foods cache:', error);
    });
    
    // If authenticated, also save to Firestore (async, non-blocking)
    const user = getCurrentUser();
    if (user) {
      // Firestore save happens after cache, but we don't wait for it to complete
      // This ensures the UI is responsive even if Firestore is slow
      // Convert logToSave back to DailyLog format (with Date objects for Firestore)
      const dailyLog: DailyLog = {
        date: logToSave.date,
        meals: logToSave.meals.map((meal: any) => ({
          ...meal,
          timestamp: typeof meal.timestamp === 'string' ? new Date(meal.timestamp) : meal.timestamp,
          foods: meal.foods.map((mealFood: any) => ({
            ...mealFood,
            addedAt: typeof mealFood.addedAt === 'string' ? new Date(mealFood.addedAt) : mealFood.addedAt,
          })),
        })),
        totalMacros: logToSave.totalMacros,
        targetMacros: logToSave.targetMacros,
      };
      saveDailyLogToFirestore(dailyLog).catch((error) => {
        console.error('Error saving daily log to Firestore (will retry on sync):', error);
        // Log is already in cache, so it will sync later
      });
    }
  } catch (error) {
    console.error('Error adding food to date:', error);
    throw error;
  }
}

/**
 * Add a food to today's log (convenience function)
 */
export async function addFoodToToday(food: FoodItem, quantity: number = 1): Promise<void> {
  const today = getTodayDate();
  return addFoodToDate(food, quantity, today);
}

/**
 * Get today's log
 * If no log exists, returns a log with user profile targets (or defaults)
 */
export async function getTodayLog(): Promise<DailyLog | null> {
  try {
    const today = getTodayDate();
    const user = getCurrentUser();
    
    // If authenticated, try to get from Firestore first
    if (user) {
      try {
        const firestoreLog = await getDailyLogFromFirestore(today);
        if (firestoreLog) {
          // Ensure targetMacros are synced with user profile if missing
          if (!firestoreLog.targetMacros) {
            firestoreLog.targetMacros = await getUserTargetMacros();
          }
          
          // Asynchronously check and update target macros from Firebase if different
          updateTargetMacrosFromFirebase(firestoreLog).catch((error) => {
            console.error('Error updating target macros from Firebase:', error);
          });
          
          return firestoreLog;
        }
      } catch (error) {
        console.error('Error getting daily log from Firestore, falling back to local:', error);
      }
    }
    
    // Fallback to local storage
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    const log = logs[today];
    if (log) {
      // Convert timestamp strings back to Date objects
      const dailyLog = deserializeDailyLog(log);
      // Ensure targetMacros are synced with user profile if missing
      if (!dailyLog.targetMacros) {
        dailyLog.targetMacros = await getUserTargetMacros();
      }
      
      // Asynchronously check and update target macros from Firebase if different
      updateTargetMacrosFromFirebase(dailyLog).catch((error) => {
        console.error('Error updating target macros from Firebase:', error);
      });
      
      return dailyLog;
    }
    
    // If no log exists, return a log with user profile targets (for consistency with getLogForDate)
    const targetMacros = await getUserTargetMacros();
    return {
      date: today,
      meals: [],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      targetMacros: targetMacros,
    };
  } catch (error) {
    console.error('Error getting today log:', error);
    return null;
  }
}

/**
 * Get log for a specific date
 * If no log exists, returns a log with user profile targets (or defaults)
 */
export async function getLogForDate(date: string): Promise<DailyLog | null> {
  try {
    // Always read from local storage first (cache-first strategy)
    // This ensures we get the latest data immediately after writes
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    const log = logs[date];
    
    // If we have local data, use it (it's the most up-to-date)
    if (log) {
      console.log(`[getLogForDate] Found local log for ${date}, meals count:`, log.meals?.length || 0);
      // Convert timestamp strings back to Date objects
      const dailyLog = deserializeDailyLog(log);
      // Ensure targetMacros are synced with user profile if missing
      if (!dailyLog.targetMacros) {
        dailyLog.targetMacros = await getUserTargetMacros();
      }
      
      // Asynchronously check and update target macros from Firebase if different
      updateTargetMacrosFromFirebase(dailyLog).catch((error) => {
        console.error('Error updating target macros from Firebase:', error);
      });
      
      console.log(`[getLogForDate] Returning daily log with ${dailyLog.meals.length} meals, total foods:`, 
        dailyLog.meals.reduce((sum, m) => sum + m.foods.length, 0));
      return dailyLog;
    }
    
    console.log(`[getLogForDate] No local log found for ${date}`);
    
    // If no local data and authenticated, try Firestore
    const user = getCurrentUser();
    if (user) {
      try {
        const firestoreLog = await getDailyLogFromFirestore(date);
        if (firestoreLog) {
          // Ensure targetMacros are synced with user profile if missing
          if (!firestoreLog.targetMacros) {
            firestoreLog.targetMacros = await getUserTargetMacros();
          }
          
          // Asynchronously check and update target macros from Firebase if different
          updateTargetMacrosFromFirebase(firestoreLog).catch((error) => {
            console.error('Error updating target macros from Firebase:', error);
          });
          
          return firestoreLog;
        }
      } catch (error) {
        console.error('Error getting daily log from Firestore:', error);
      }
    }
    
    // If no log exists, return a log with user profile targets (for dashboard display)
    // This allows the dashboard to show targets even when no foods have been logged
    const targetMacros = await getUserTargetMacros();
    return {
      date: date,
      meals: [],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      targetMacros: targetMacros,
    };
  } catch (error) {
    console.error('Error getting log for date:', error);
    return null;
  }
}

/**
 * Reorder foods in a meal
 */
export async function reorderFoodsInMeal(mealId: string, fromIndex: number, toIndex: number): Promise<void> {
  try {
    const today = getTodayDate();
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const todayLog = logs[today];
    if (!todayLog) return;
    
    const mealIndex = todayLog.meals.findIndex((m: any) => m.id === mealId);
    if (mealIndex >= 0 && todayLog.meals[mealIndex].foods[fromIndex] && todayLog.meals[mealIndex].foods[toIndex] !== undefined) {
      const meal = todayLog.meals[mealIndex];
      const [movedFood] = meal.foods.splice(fromIndex, 1);
      meal.foods.splice(toIndex, 0, movedFood);
      
      // Recalculate meal macros
      meal.macros = calculateMacros(meal.foods);
      
      // Recalculate total macros for the day
      const allMealFoods: MealFood[] = todayLog.meals.flatMap((meal: any) => meal.foods);
      todayLog.totalMacros = calculateMacros(allMealFoods);
      
      // Convert Date objects to ISO strings for storage
      const logToSave = serializeDailyLog(todayLog as DailyLog);
      
      logs[today] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error reordering foods:', error);
    throw error;
  }
}

/**
 * Remove a food from a specific date's log
 */
export async function removeFoodFromDate(date: string, mealId: string, foodIndex: number): Promise<void> {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const dateLog = logs[date];
    if (!dateLog) return;
    
    // Find the meal and remove the food at the specified index
    const mealIndex = dateLog.meals.findIndex((m: any) => m.id === mealId);
    if (mealIndex >= 0 && dateLog.meals[mealIndex].foods[foodIndex]) {
      dateLog.meals[mealIndex].foods.splice(foodIndex, 1);
      
      // Recalculate meal macros
      if (dateLog.meals[mealIndex].foods.length > 0) {
        dateLog.meals[mealIndex].macros = calculateMacros(dateLog.meals[mealIndex].foods);
      } else {
        // Remove meal if it has no foods
        dateLog.meals.splice(mealIndex, 1);
      }
      
      // Recalculate total macros for the day
      const allMealFoods: MealFood[] = dateLog.meals.flatMap((meal: any) => meal.foods);
      dateLog.totalMacros = calculateMacros(allMealFoods);
      
      // Convert Date objects to ISO strings for storage
      const logToSave = serializeDailyLog(dateLog as DailyLog);
      
      logs[date] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
      
      // Invalidate recent foods cache since we removed a food
      invalidateRecentFoodsCache().catch((error) => {
        console.error('Error invalidating recent foods cache:', error);
      });
    }
  } catch (error) {
    console.error('Error removing food from date:', error);
    throw error;
  }
}

/**
 * Remove a food from today's log (convenience function)
 */
export async function removeFoodFromToday(mealId: string, foodIndex: number): Promise<void> {
  const today = getTodayDate();
  return removeFoodFromDate(today, mealId, foodIndex);
}

/**
 * Move a food item from one date to another
 */
export async function moveFoodToDate(fromDate: string, toDate: string, mealId: string, foodIndex: number): Promise<void> {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const fromDateLog = logs[fromDate];
    if (!fromDateLog) return;
    
    // Find the meal and get the food at the specified index
    const mealIndex = fromDateLog.meals.findIndex((m: any) => m.id === mealId);
    if (mealIndex >= 0 && fromDateLog.meals[mealIndex].foods[foodIndex]) {
      const mealFood = fromDateLog.meals[mealIndex].foods[foodIndex];
      
      // Remove from old date
      fromDateLog.meals[mealIndex].foods.splice(foodIndex, 1);
      
      // Recalculate meal macros for old date
      if (fromDateLog.meals[mealIndex].foods.length > 0) {
        fromDateLog.meals[mealIndex].macros = calculateMacros(fromDateLog.meals[mealIndex].foods);
      } else {
        // Remove meal if it has no foods
        fromDateLog.meals.splice(mealIndex, 1);
      }
      
      // Recalculate total macros for old date
      const allMealFoodsOld: MealFood[] = fromDateLog.meals.flatMap((meal: Meal) => meal.foods);
      fromDateLog.totalMacros = calculateMacros(allMealFoodsOld);
      
      // Add to new date
      let toDateLog = logs[toDate];
      if (!toDateLog) {
        // Use user profile targets instead of hardcoded defaults
        const targetMacros = await getUserTargetMacros();
        toDateLog = {
          date: toDate,
          meals: [],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: targetMacros,
        };
      }
      
      // Update addedAt timestamp
      mealFood.addedAt = new Date();
      
      // Add to a default "Meal" or create a new meal
      if (toDateLog.meals.length === 0) {
        toDateLog.meals.push({
          id: await generateFoodId(),
          name: 'Meal',
          foods: [mealFood],
          timestamp: new Date(),
          macros: calculateMacros([mealFood]),
        });
      } else {
        // Add to the first meal
        toDateLog.meals[0].foods.push(mealFood);
        toDateLog.meals[0].macros = calculateMacros(toDateLog.meals[0].foods);
      }
      
      // Recalculate total macros for new date
      const allMealFoodsNew: MealFood[] = toDateLog.meals.flatMap((meal: Meal) => meal.foods);
      toDateLog.totalMacros = calculateMacros(allMealFoodsNew);
      
      // Convert Date objects to ISO strings for storage
      const logsToSave: Record<string, any> = {};
      for (const date in logs) {
        const log = logs[date] as DailyLog;
        logsToSave[date] = serializeDailyLog(log);
      }
      
      // Add new date log if it didn't exist
      if (!logs[toDate]) {
        logsToSave[toDate] = serializeDailyLog(toDateLog as DailyLog);
      }
      
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logsToSave));
      
      // Invalidate recent foods cache since we moved a food (which updates its addedAt timestamp)
      invalidateRecentFoodsCache().catch((error) => {
        console.error('Error invalidating recent foods cache:', error);
      });
    }
  } catch (error) {
    console.error('Error moving food to date:', error);
    throw error;
  }
}

/**
 * Update the quantity of a food item in a specific date's log
 */
export async function updateFoodQuantityInDate(date: string, mealId: string, foodIndex: number, newQuantity: number): Promise<void> {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const dateLog = logs[date];
    if (!dateLog) return;
    
    // Find the meal and update the food quantity at the specified index
    const mealIndex = dateLog.meals.findIndex((m: any) => m.id === mealId);
    if (mealIndex >= 0 && dateLog.meals[mealIndex].foods[foodIndex]) {
      dateLog.meals[mealIndex].foods[foodIndex].quantity = newQuantity;
      
      // Recalculate meal macros
      dateLog.meals[mealIndex].macros = calculateMacros(dateLog.meals[mealIndex].foods);
      
      // Recalculate total macros for the day
      const allMealFoods: MealFood[] = dateLog.meals.flatMap((meal: Meal) => meal.foods);
      dateLog.totalMacros = calculateMacros(allMealFoods);
      
      // Convert Date objects to ISO strings for storage
      const logToSave = serializeDailyLog(dateLog as DailyLog);
      
      logs[date] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error updating food quantity:', error);
    throw error;
  }
}

/**
 * Get recent foods sorted by when they were last added to a meal
 * Returns an array of unique foods with their last added timestamp
 * Uses cache for fast retrieval
 */
export async function getRecentFoods(limit: number = 10): Promise<Array<{ food: FoodItem; lastAdded: Date }>> {
  try {
    // Try to get from cache first - this should be very fast
    const cacheJson = await AsyncStorage.getItem(RECENT_FOODS_CACHE_KEY);
    if (cacheJson) {
      try {
        const cached = JSON.parse(cacheJson);
        // Validate cache structure
        if (Array.isArray(cached) && cached.length > 0) {
          // Convert ISO strings back to Date objects
          const recentFoods = cached.map((item: any) => ({
            food: item.food,
            lastAdded: new Date(item.lastAdded),
          }));
          // Return cached data immediately
          return recentFoods.slice(0, limit);
        }
      } catch (cacheError) {
        console.error('Error parsing recent foods cache:', cacheError);
        // Fall through to rebuild cache
      }
    }
    
    // Cache miss or invalid - rebuild from daily logs
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    if (!logsJson) return [];
    
    const logs: Record<string, any> = JSON.parse(logsJson);
    const foodMap = new Map<string, { food: FoodItem; lastAdded: Date }>();
    
    // Iterate through all daily logs
    for (const date in logs) {
      const log = logs[date];
      if (!log || !log.meals || !Array.isArray(log.meals)) continue;
      
      // Iterate through all meals
      for (const meal of log.meals) {
        if (!meal.foods || !Array.isArray(meal.foods)) continue;
        
        // Iterate through all foods in the meal
        for (const mealFood of meal.foods) {
          if (!mealFood.food || !mealFood.food.id) continue;
          
          const foodId = mealFood.food.id;
          const addedAt = mealFood.addedAt 
            ? (typeof mealFood.addedAt === 'string' ? new Date(mealFood.addedAt) : mealFood.addedAt)
            : (meal.timestamp 
                ? (typeof meal.timestamp === 'string' ? new Date(meal.timestamp) : meal.timestamp)
                : new Date());
          
          // If we haven't seen this food, or this is a more recent addition
          if (!foodMap.has(foodId) || foodMap.get(foodId)!.lastAdded < addedAt) {
            foodMap.set(foodId, {
              food: mealFood.food,
              lastAdded: addedAt,
            });
          }
        }
      }
    }
    
    // Convert map to array, sort by lastAdded (most recent first), and limit
    const recentFoods = Array.from(foodMap.values())
      .sort((a, b) => b.lastAdded.getTime() - a.lastAdded.getTime())
      .slice(0, Math.max(limit, 10)); // Cache more than requested for faster future queries
    
    // Update cache for next time (async, don't wait - fire and forget)
    updateRecentFoodsCache(recentFoods).catch((error) => {
      console.error('Error updating recent foods cache:', error);
    });
    
    // Return only the requested limit
    return recentFoods.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent foods:', error);
    return [];
  }
}

/**
 * Update the recent foods cache
 * This is called asynchronously and doesn't block the main thread
 */
async function updateRecentFoodsCache(recentFoods: Array<{ food: FoodItem; lastAdded: Date }>): Promise<void> {
  try {
    // Convert Date objects to ISO strings for storage
    const cacheData = recentFoods.map((item) => ({
      food: item.food,
      lastAdded: item.lastAdded.toISOString(),
    }));
    const cacheJson = JSON.stringify(cacheData);
    // Use setItem which is async but we don't wait for it
    AsyncStorage.setItem(RECENT_FOODS_CACHE_KEY, cacheJson).catch((error) => {
      console.error('Error updating recent foods cache:', error);
    });
  } catch (error) {
    console.error('Error preparing recent foods cache:', error);
  }
}

/**
 * Invalidate and rebuild the recent foods cache
 * Call this when foods are added/removed to keep cache in sync
 */
export async function invalidateRecentFoodsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_FOODS_CACHE_KEY);
    // Optionally rebuild cache immediately
    await getRecentFoods(10);
  } catch (error) {
    console.error('Error invalidating recent foods cache:', error);
  }
}
