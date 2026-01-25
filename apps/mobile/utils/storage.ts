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

// Save a food item to the food database and update all instances in daily logs
export async function saveFood(food: FoodItem): Promise<void> {
  try {
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
          const log = logs[date];
          logsToSave[date] = {
            ...log,
            meals: log.meals.map((meal: any) => ({
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
        }
        await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logsToSave));
      }
    }
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

// Get a food by ID
export async function getFoodById(foodId: string): Promise<FoodItem | null> {
  try {
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    if (!foodsJson) return null;
    const foods: FoodItem[] = JSON.parse(foodsJson);
    return foods.find(f => f.id === foodId) || null;
  } catch (error) {
    console.error('Error getting food by ID:', error);
    return null;
  }
}

// Add a food to a specific date's log
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
    const logToSave = {
      ...dateLog,
      meals: dateLog.meals.map((meal: any) => ({
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
    logs[date] = logToSave;
    await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error adding food to date:', error);
    throw error;
  }
}

// Add a food to today's log (convenience function)
export async function addFoodToToday(food: FoodItem, quantity: number = 1): Promise<void> {
  const today = getTodayDate();
  return addFoodToDate(food, quantity, today);
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

// Remove a food from a specific date's log
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
      const logToSave = {
        ...dateLog,
        meals: dateLog.meals.map((meal: any) => ({
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
      
      logs[date] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error removing food from date:', error);
    throw error;
  }
}

// Remove a food from today's log (convenience function)
export async function removeFoodFromToday(mealId: string, foodIndex: number): Promise<void> {
  const today = getTodayDate();
  return removeFoodFromDate(today, mealId, foodIndex);
}

// Move a food item from one date to another
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
        const log = logs[date];
        logsToSave[date] = {
          ...log,
          meals: log.meals.map((meal: any) => ({
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
      }
      
      // Add new date log if it didn't exist
      if (!logs[toDate]) {
        logsToSave[toDate] = {
          ...toDateLog,
          meals: toDateLog.meals.map((meal: any) => ({
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
      }
      
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logsToSave));
    }
  } catch (error) {
    console.error('Error moving food to date:', error);
    throw error;
  }
}

// Update the quantity of a food item in a specific date's log
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
      const logToSave = {
        ...dateLog,
        meals: dateLog.meals.map((meal: any) => ({
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
      
      logs[date] = logToSave;
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Error updating food quantity:', error);
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
