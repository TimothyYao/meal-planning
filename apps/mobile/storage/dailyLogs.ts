import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, MealFood, FoodItem, MacroTargets, calculateMacros, Meal, serializeDailyLog, deserializeDailyLog } from '@meal-planning/shared';
import { getCurrentUser } from '../utils/auth';
import {
  saveDailyLogToFirestore,
  getDailyLogFromFirestore,
} from '../utils/firestore';
import { DAILY_LOGS_KEY } from './constants';
import { generateFoodId, getTodayDate } from './utils';

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
      dateLog = {
        date: date,
        meals: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targetMacros: { calories: 2000, protein: 150, carbs: 200, fat: 65 }, // Default targets
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
 */
export async function getTodayLog(): Promise<DailyLog | null> {
  try {
    const today = getTodayDate();
    const user = getCurrentUser();
    
    // If authenticated, try to get from Firestore first
    if (user) {
      try {
        const firestoreLog = await getDailyLogFromFirestore(today);
        if (firestoreLog) return firestoreLog;
      } catch (error) {
        console.error('Error getting daily log from Firestore, falling back to local:', error);
      }
    }
    
    // Fallback to local storage
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    const log = logs[today];
    if (!log) return null;
    
    // Convert timestamp strings back to Date objects
    return deserializeDailyLog(log);
  } catch (error) {
    console.error('Error getting today log:', error);
    return null;
  }
}

/**
 * Get log for a specific date
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
        if (firestoreLog) return firestoreLog;
      } catch (error) {
        console.error('Error getting daily log from Firestore:', error);
      }
    }
    
    return null;
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
        toDateLog = {
          date: toDate,
          meals: [],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
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
