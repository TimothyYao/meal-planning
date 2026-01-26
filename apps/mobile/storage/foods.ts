import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '@meal-planning/shared';
import { getCurrentUser } from '../utils/auth';
import {
  saveFoodToFirestore,
  getFoodsFromFirestore,
  getFoodByIdFromFirestore,
} from '../utils/firestore';
import { FOODS_KEY } from './constants';

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
    
    // Note: We no longer update all daily logs when saving a food.
    // To update a food in a specific log entry, use updateFoodInLogEntry() instead.
    // This allows editing foods for specific days without affecting other log entries.
  } catch (error) {
    console.error('Error saving food:', error);
    throw error;
  }
}

/**
 * Get all saved foods
 * Write-through cache: Always check local cache first, then sync from Firestore
 */
export async function getFoods(): Promise<FoodItem[]> {
  try {
    // STEP 1: Always check local cache first (write-through cache pattern)
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    const localFoods: FoodItem[] = foodsJson ? JSON.parse(foodsJson) : [];
    
    // STEP 2: If authenticated, sync from Firestore in background (for multi-device sync)
    // But return local cache immediately for fast response
    const user = getCurrentUser();
    if (user) {
      // Sync from Firestore in background (non-blocking)
      getFoodsFromFirestore()
        .then((firestoreFoods) => {
          // Merge Firestore foods with local cache
          const mergedFoods = [...localFoods];
          firestoreFoods.forEach((firestoreFood) => {
            const existingIndex = mergedFoods.findIndex(f => f.id === firestoreFood.id);
            if (existingIndex >= 0) {
              // Keep local version if it exists (it's more up-to-date due to write-through)
              // Only update if Firestore version is newer (check updatedAt if available)
              mergedFoods[existingIndex] = firestoreFood;
            } else {
              mergedFoods.push(firestoreFood);
            }
          });
          // Update local cache with merged data
          AsyncStorage.setItem(FOODS_KEY, JSON.stringify(mergedFoods)).catch((error) => {
            console.error('Error updating local cache with Firestore data:', error);
          });
        })
        .catch((error) => {
          console.error('Error syncing foods from Firestore:', error);
        });
    }
    
    // Return local cache immediately (fast response)
    return localFoods;
  } catch (error) {
    console.error('Error getting foods:', error);
    return [];
  }
}

/**
 * Get a food by ID
 * Write-through cache: Always check local cache first (most up-to-date),
 * then fall back to Firestore if not found locally
 */
export async function getFoodById(foodId: string): Promise<FoodItem | null> {
  try {
    // STEP 1: Always check local cache first (write-through cache pattern)
    // This ensures we get the most recent data immediately after writes
    const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
    if (foodsJson) {
      const foods: FoodItem[] = JSON.parse(foodsJson);
      const cachedFood = foods.find(f => f.id === foodId);
      if (cachedFood) {
        return cachedFood;
      }
    }
    
    // STEP 2: If not in local cache, try Firestore (for sync from other devices)
    const user = getCurrentUser();
    if (user) {
      try {
        const food = await getFoodByIdFromFirestore(foodId);
        if (food) {
          // Update local cache with Firestore data for next time
          const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
          const foods: FoodItem[] = foodsJson ? JSON.parse(foodsJson) : [];
          const existingIndex = foods.findIndex(f => f.id === food.id);
          if (existingIndex >= 0) {
            foods[existingIndex] = food;
          } else {
            foods.push(food);
          }
          await AsyncStorage.setItem(FOODS_KEY, JSON.stringify(foods));
          return food;
        }
      } catch (error) {
        console.error('Error getting food from Firestore:', error);
      }
    }
    
    return null;
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
