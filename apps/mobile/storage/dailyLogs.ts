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
 * Compare two DailyLog objects to see if they are different
 * Compares meals, totalMacros, and targetMacros
 */
function areLogsDifferent(log1: DailyLog, log2: DailyLog): boolean {
  // Compare target macros
  if (
    log1.targetMacros.calories !== log2.targetMacros.calories ||
    log1.targetMacros.protein !== log2.targetMacros.protein ||
    log1.targetMacros.carbs !== log2.targetMacros.carbs ||
    log1.targetMacros.fat !== log2.targetMacros.fat
  ) {
    return true;
  }

  // Compare total macros
  if (
    log1.totalMacros.calories !== log2.totalMacros.calories ||
    log1.totalMacros.protein !== log2.totalMacros.protein ||
    log1.totalMacros.carbs !== log2.totalMacros.carbs ||
    log1.totalMacros.fat !== log2.totalMacros.fat
  ) {
    return true;
  }

  // Compare meals count
  if (log1.meals.length !== log2.meals.length) {
    return true;
  }

  // Compare each meal
  for (let i = 0; i < log1.meals.length; i++) {
    const meal1 = log1.meals[i];
    const meal2 = log2.meals[i];
    
    if (meal1.id !== meal2.id || meal1.name !== meal2.name) {
      return true;
    }
    
    if (meal1.foods.length !== meal2.foods.length) {
      return true;
    }
    
    // Compare foods in meal
    for (let j = 0; j < meal1.foods.length; j++) {
      const food1 = meal1.foods[j];
      const food2 = meal2.foods[j];
      
      if (
        food1.foodId !== food2.foodId ||
        food1.quantity !== food2.quantity
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count total foods in a log
 */
function countFoodsInLog(log: DailyLog): number {
  return log.meals.reduce((sum, meal) => sum + meal.foods.length, 0);
}

/**
 * Asynchronously check and update daily log from Firebase if different
 * This runs in the background and doesn't block the return value
 * 
 * IMPORTANT: This function checks if the local version has changed before updating
 * to avoid race conditions where user makes changes while sync is in progress.
 * It also prevents overwriting local deletions by checking if local has fewer foods.
 */
async function updateLogFromFirebaseIfDifferent(log: DailyLog): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;

    // Store a snapshot of the log we're comparing against
    const originalLogSnapshot = JSON.stringify(serializeDailyLog(log));
    const originalFoodCount = countFoodsInLog(log);

    // Fetch the entire log from Firebase
    const firebaseLog = await getDailyLogFromFirestore(log.date);
    
    if (firebaseLog) {
      // Compare the entire log
      if (areLogsDifferent(log, firebaseLog)) {
        // Before updating, check if local storage has changed since we retrieved the log
        // This prevents overwriting user changes that happened during the sync
        const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
        const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
        const currentLocalLog = logs[log.date];
        
        if (currentLocalLog) {
          // Check if local version has changed since we started
          const currentLocalSnapshot = JSON.stringify(currentLocalLog);
          if (currentLocalSnapshot !== originalLogSnapshot) {
            console.log('[updateLogFromFirebaseIfDifferent] Local log changed during sync, skipping update to avoid overwriting user changes:', {
              date: log.date,
            });
            return;
          }
          
          // Deserialize to check food count
          const currentLocalDailyLog = deserializeDailyLog(currentLocalLog);
          const currentLocalFoodCount = countFoodsInLog(currentLocalDailyLog);
          const firebaseFoodCount = countFoodsInLog(firebaseLog);
          
          // If local has fewer foods than Firebase, it means a deletion happened locally
          // Don't overwrite local deletions - wait for Firestore to sync the deletion first
          if (currentLocalFoodCount < firebaseFoodCount) {
            console.log('[updateLogFromFirebaseIfDifferent] Local log has fewer foods (deletion detected), skipping update to preserve local deletion:', {
              date: log.date,
              localFoodCount: currentLocalFoodCount,
              firebaseFoodCount: firebaseFoodCount,
            });
            return;
          }
        }
        
        console.log('[updateLogFromFirebaseIfDifferent] Log differs from Firebase, updating:', {
          date: log.date,
        });
        
        // Update local storage with Firebase version
        const logToSave = serializeDailyLog(firebaseLog);
        logs[log.date] = logToSave;
        await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
        
        console.log('[updateLogFromFirebaseIfDifferent] Successfully updated log from Firebase for', log.date);
      }
    }
  } catch (error) {
    console.error('[updateLogFromFirebaseIfDifferent] Error updating log from Firebase:', error);
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
          
          // Asynchronously check and update entire log from Firebase if different
          updateLogFromFirebaseIfDifferent(firestoreLog).catch((error) => {
            console.error('Error updating log from Firebase:', error);
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
      
      // Asynchronously check and update entire log from Firebase if different
      updateLogFromFirebaseIfDifferent(dailyLog).catch((error) => {
        console.error('Error updating log from Firebase:', error);
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
      
      // Asynchronously check and update entire log from Firebase if different
      updateLogFromFirebaseIfDifferent(dailyLog).catch((error) => {
        console.error('Error updating log from Firebase:', error);
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
          
          // Asynchronously check and update entire log from Firebase if different
          updateLogFromFirebaseIfDifferent(firestoreLog).catch((error) => {
            console.error('Error updating log from Firebase:', error);
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
      console.log(`[removeFoodFromDate] Saved log for ${date}, meals count:`, logToSave.meals.length, 
        'total foods:', logToSave.meals.reduce((sum: number, m: any) => sum + m.foods.length, 0));
      
      // Invalidate recent foods cache since we removed a food
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
 * Update the food item in a specific log entry (only updates that log entry, not the global food)
 * This allows editing a food for a specific day without affecting the food definition or other log entries
 */
export async function updateFoodInLogEntry(
  date: string, 
  mealId: string, 
  foodIndex: number, 
  updatedFood: FoodItem, 
  newQuantity?: number
): Promise<void> {
  try {
    console.log('[updateFoodInLogEntry] Updating food in log entry', { date, mealId, foodIndex, foodName: updatedFood.name, newQuantity });
    
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const dateLog = logs[date];
    if (!dateLog) {
      console.warn('[updateFoodInLogEntry] Log not found for date:', date);
      return;
    }
    
    // Deserialize the log to work with Date objects
    const dailyLog = deserializeDailyLog(dateLog);
    
    // Find the meal and update the food at the specified index
    const mealIndex = dailyLog.meals.findIndex((m: Meal) => m.id === mealId);
    if (mealIndex >= 0 && dailyLog.meals[mealIndex].foods[foodIndex]) {
      // Update the food object in this log entry only
      dailyLog.meals[mealIndex].foods[foodIndex].food = updatedFood;
      
      // Update quantity if provided
      if (newQuantity !== undefined) {
        dailyLog.meals[mealIndex].foods[foodIndex].quantity = newQuantity;
      }
      
      // Recalculate meal macros
      dailyLog.meals[mealIndex].macros = calculateMacros(dailyLog.meals[mealIndex].foods);
      
      // Recalculate total macros for the day
      const allMealFoods: MealFood[] = dailyLog.meals.flatMap((meal: Meal) => meal.foods);
      dailyLog.totalMacros = calculateMacros(allMealFoods);
      
      // Convert Date objects to ISO strings for storage
      const logToSave = serializeDailyLog(dailyLog);
      
      logs[date] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
      console.log('[updateFoodInLogEntry] Successfully updated log entry');
      
      // If authenticated, also save to Firestore
      const user = getCurrentUser();
      if (user) {
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
          console.error('Error saving daily log to Firestore:', error);
        });
      }
    }
  } catch (error) {
    console.error('Error updating food in log entry:', error);
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
