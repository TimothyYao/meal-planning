import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { DailyLog, MealFood, FoodItem, MacroTargets, calculateMacros, Meal } from '@meal-planning/shared';

const DAILY_LOGS_KEY = '@meal_planning:daily_logs';
const FOODS_KEY = '@meal_planning:foods';
const LAST_PROTEIN_KEY = '@meal_planning:last_protein';
const LAST_CARBS_KEY = '@meal_planning:last_carbs';
const LAST_FAT_KEY = '@meal_planning:last_fat';

// Generate a UUID for food items
export async function generateFoodId(): Promise<string> {
  return await Crypto.randomUUID();
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Save a food item to the food database
export async function saveFood(food: FoodItem): Promise<void> {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    const foods: FoodItem[] = foodsJson ? JSON.parse(foodsJson) : [];
    
    // Check if food with same name already exists, update it
    const existingIndex = foods.findIndex(f => f.id === food.id);
    if (existingIndex >= 0) {
      foods[existingIndex] = food;
    } else {
      foods.push(food);
    }
    
    await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(foods));
  } catch (error) {
    console.error('Error saving food:', error);
    throw error;
  }
}

// Get all saved foods
export async function getFoods(): Promise<FoodItem[]> {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    return foodsJson ? JSON.parse(foodsJson) : [];
  } catch (error) {
    console.error('Error getting foods:', error);
    return [];
  }
}

// Add a food to today's log
export async function addFoodToToday(food: FoodItem, quantity: number = 1): Promise<void> {
  try {
    const today = getTodayDate();
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    // Get or create today's log
    let todayLog = logs[today];
    if (!todayLog) {
      todayLog = {
        date: today,
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
    if (todayLog.meals.length === 0) {
      todayLog.meals.push({
        id: await generateFoodId(),
        name: 'Meal',
        foods: [mealFood],
        timestamp: new Date(),
        macros: calculateMacros([mealFood]),
      });
    } else {
      // Add to the first meal (or you could create separate meals)
      todayLog.meals[0].foods.push(mealFood);
      todayLog.meals[0].macros = calculateMacros(todayLog.meals[0].foods);
    }

    // Recalculate total macros for the day
    const allMealFoods: MealFood[] = todayLog.meals.flatMap((meal: Meal) => meal.foods);
    todayLog.totalMacros = calculateMacros(allMealFoods);

    // Convert Date objects to ISO strings for storage
    const logToSave = {
      ...todayLog,
      meals: todayLog.meals.map((meal: any) => ({
        ...meal,
        timestamp: meal.timestamp instanceof Date 
          ? meal.timestamp.toISOString() 
          : (typeof meal.timestamp === 'string' ? meal.timestamp : new Date().toISOString()),
        foods: meal.foods.map((mealFood: any) => ({
          ...mealFood,
          addedAt: mealFood.addedAt instanceof Date 
            ? mealFood.addedAt.toISOString() 
            : (typeof mealFood.addedAt === 'string' ? mealFood.addedAt : new Date().toISOString()),
        })),
      })),
    };
    
    // Save updated log
    logs[today] = logToSave;
    await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error adding food to today:', error);
    throw error;
  }
}

// Get today's log
export async function getTodayLog(): Promise<DailyLog | null> {
  try {
    const today = getTodayDate();
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    const log = logs[today];
    if (!log) return null;
    
    // Convert timestamp strings back to Date objects
    const dailyLog: DailyLog = {
      ...log,
      meals: log.meals.map((meal: any) => ({
        ...meal,
        timestamp: new Date(meal.timestamp),
        foods: meal.foods.map((mealFood: any) => ({
          ...mealFood,
          addedAt: mealFood.addedAt ? new Date(mealFood.addedAt) : undefined,
        })),
      })),
    };
    
    return dailyLog;
  } catch (error) {
    console.error('Error getting today log:', error);
    return null;
  }
}

// Get log for a specific date
export async function getLogForDate(date: string): Promise<DailyLog | null> {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    const log = logs[date];
    if (!log) return null;
    
    // Convert timestamp strings back to Date objects
    const dailyLog: DailyLog = {
      ...log,
      meals: log.meals.map((meal: any) => ({
        ...meal,
        timestamp: new Date(meal.timestamp),
        foods: meal.foods.map((mealFood: any) => ({
          ...mealFood,
          addedAt: mealFood.addedAt ? new Date(mealFood.addedAt) : undefined,
        })),
      })),
    };
    
    return dailyLog;
  } catch (error) {
    console.error('Error getting log for date:', error);
    return null;
  }
}

// Reorder foods in a meal
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
      const logToSave = {
        ...todayLog,
        meals: todayLog.meals.map((meal: any) => ({
          ...meal,
          timestamp: meal.timestamp instanceof Date 
            ? meal.timestamp.toISOString() 
            : (typeof meal.timestamp === 'string' ? meal.timestamp : new Date().toISOString()),
          foods: meal.foods.map((mealFood: any) => ({
            ...mealFood,
            addedAt: mealFood.addedAt instanceof Date 
              ? mealFood.addedAt.toISOString() 
              : (typeof mealFood.addedAt === 'string' ? mealFood.addedAt : (mealFood.addedAt ? new Date().toISOString() : undefined)),
          })),
        })),
      };
      
      logs[today] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error reordering foods:', error);
    throw error;
  }
}

// Remove a food from today's log
export async function removeFoodFromToday(mealId: string, foodIndex: number): Promise<void> {
  try {
    const today = getTodayDate();
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, any> = logsJson ? JSON.parse(logsJson) : {};
    
    const todayLog = logs[today];
    if (!todayLog) return;
    
    // Find the meal and remove the food at the specified index
    const mealIndex = todayLog.meals.findIndex((m: any) => m.id === mealId);
    if (mealIndex >= 0 && todayLog.meals[mealIndex].foods[foodIndex]) {
      todayLog.meals[mealIndex].foods.splice(foodIndex, 1);
      
      // Recalculate meal macros
      if (todayLog.meals[mealIndex].foods.length > 0) {
        todayLog.meals[mealIndex].macros = calculateMacros(todayLog.meals[mealIndex].foods);
      } else {
        // Remove meal if it has no foods
        todayLog.meals.splice(mealIndex, 1);
      }
      
      // Recalculate total macros for the day
      const allMealFoods: MealFood[] = todayLog.meals.flatMap((meal: any) => meal.foods);
      todayLog.totalMacros = calculateMacros(allMealFoods);
      
      // Convert Date objects to ISO strings for storage
      const logToSave = {
        ...todayLog,
        meals: todayLog.meals.map((meal: any) => ({
          ...meal,
          timestamp: meal.timestamp instanceof Date 
            ? meal.timestamp.toISOString() 
            : (typeof meal.timestamp === 'string' ? meal.timestamp : new Date().toISOString()),
          foods: meal.foods.map((mealFood: any) => ({
            ...mealFood,
            addedAt: mealFood.addedAt instanceof Date 
              ? mealFood.addedAt.toISOString() 
              : (typeof mealFood.addedAt === 'string' ? mealFood.addedAt : (mealFood.addedAt ? new Date().toISOString() : undefined)),
          })),
        })),
      };
      
      logs[today] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error removing food from today:', error);
    throw error;
  }
}

// Set target macros for today
export async function setTodayTargetMacros(targets: MacroTargets): Promise<void> {
  try {
    const today = getTodayDate();
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    const logs: Record<string, DailyLog> = logsJson ? JSON.parse(logsJson) : {};
    
    if (!logs[today]) {
      logs[today] = {
        date: today,
        meals: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targetMacros: targets,
      };
    } else {
      logs[today].targetMacros = targets;
    }
    
    await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error setting target macros:', error);
    throw error;
  }
}

// Save last protein value
export async function saveLastProtein(protein: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PROTEIN_KEY, protein.toString());
  } catch (error) {
    console.error('Error saving last protein:', error);
  }
}

// Get last protein value
export async function getLastProtein(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_PROTEIN_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last protein:', error);
    return null;
  }
}

// Save last carbs value
export async function saveLastCarbs(carbs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CARBS_KEY, carbs.toString());
  } catch (error) {
    console.error('Error saving last carbs:', error);
  }
}

// Get last carbs value
export async function getLastCarbs(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_CARBS_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last carbs:', error);
    return null;
  }
}

// Save last fat value
export async function saveLastFat(fat: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_FAT_KEY, fat.toString());
  } catch (error) {
    console.error('Error saving last fat:', error);
  }
}

// Get last fat value
export async function getLastFat(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_FAT_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last fat:', error);
    return null;
  }
}
