import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUser } from './auth';
import type { FoodItem, DailyLog, MealFood, Meal, MacroTargets } from '@meal-planning/shared';

// Use localStorage for web caching
const CACHE_PREFIX = 'firestore_cache:';
const SYNC_TIMESTAMP_KEY = 'firestore_sync_timestamp';

/**
 * Get the user's Firestore collection path
 */
function getUserPath(collectionName: string): string {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to access Firestore');
  }
  return `users/${user.uid}/${collectionName}`;
}

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamp(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

/**
 * Convert Date to Firestore timestamp
 */
function toTimestamp(date: Date | string | undefined): Timestamp | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return Timestamp.fromDate(d);
}

/**
 * Cache data locally
 */
function cacheData(key: string, data: any): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    localStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

/**
 * Get cached data
 */
function getCachedData(key: string): any | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

/**
 * Save a food item to Firestore and cache locally
 */
export async function saveFoodToFirestore(food: FoodItem): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('User must be authenticated');

  const foodRef = doc(db, getUserPath('foods'), food.id);
  await setDoc(foodRef, {
    ...food,
    updatedAt: Timestamp.now(),
  });

  // Cache locally
  const foods = await getFoodsFromFirestore();
  const existingIndex = foods.findIndex(f => f.id === food.id);
  if (existingIndex >= 0) {
    foods[existingIndex] = food;
  } else {
    foods.push(food);
  }
  cacheData('foods', foods);
}

/**
 * Get all foods from Firestore (with local cache fallback)
 */
export async function getFoodsFromFirestore(): Promise<FoodItem[]> {
  const user = getCurrentUser();
  if (!user) {
    // Return cached data if available
    const cached = getCachedData('foods');
    return cached || [];
  }

  try {
    const foodsRef = collection(db, getUserPath('foods'));
    const snapshot = await getDocs(foodsRef);
    const foods: FoodItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as FoodItem));

    // Cache locally
    cacheData('foods', foods);
    return foods;
  } catch (error) {
    console.error('Error getting foods from Firestore:', error);
    // Fallback to cache
    const cached = getCachedData('foods');
    return cached || [];
  }
}

/**
 * Get a food by ID from Firestore
 */
export async function getFoodByIdFromFirestore(foodId: string): Promise<FoodItem | null> {
  const user = getCurrentUser();
  if (!user) {
    const cached = getCachedData('foods');
    if (cached) {
      return cached.find((f: FoodItem) => f.id === foodId) || null;
    }
    return null;
  }

  try {
    const foodRef = doc(db, getUserPath('foods'), foodId);
    const snapshot = await getDoc(foodRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as FoodItem;
    }
    return null;
  } catch (error) {
    console.error('Error getting food by ID:', error);
    const cached = getCachedData('foods');
    if (cached) {
      return cached.find((f: FoodItem) => f.id === foodId) || null;
    }
    return null;
  }
}

/**
 * Save a daily log to Firestore and cache locally
 */
export async function saveDailyLogToFirestore(log: DailyLog): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('User must be authenticated');

  const logRef = doc(db, getUserPath('dailyLogs'), log.date);
  const logData = {
    ...log,
    meals: log.meals.map(meal => ({
      ...meal,
      timestamp: toTimestamp(meal.timestamp),
      foods: meal.foods.map(mealFood => ({
        ...mealFood,
        addedAt: toTimestamp(mealFood.addedAt),
      })),
    })),
    updatedAt: Timestamp.now(),
  };

  await setDoc(logRef, logData, { merge: true });

  // Cache locally
  const cached = getCachedData('dailyLogs') || {};
  cached[log.date] = log;
  cacheData('dailyLogs', cached);
}

/**
 * Get a daily log from Firestore (with local cache fallback)
 */
export async function getDailyLogFromFirestore(date: string): Promise<DailyLog | null> {
  const user = getCurrentUser();
  if (!user) {
    const cached = getCachedData('dailyLogs');
    if (cached && cached[date]) {
      return cached[date];
    }
    return null;
  }

  try {
    const logRef = doc(db, getUserPath('dailyLogs'), date);
    const snapshot = await getDoc(logRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      const log: DailyLog = {
        ...data,
        meals: data.meals.map((meal: any) => ({
          ...meal,
          timestamp: convertTimestamp(meal.timestamp),
          foods: meal.foods.map((mealFood: any) => ({
            ...mealFood,
            addedAt: mealFood.addedAt ? convertTimestamp(mealFood.addedAt) : undefined,
          })),
        })),
      } as DailyLog;

      // Cache locally
      const cached = getCachedData('dailyLogs') || {};
      cached[date] = log;
      cacheData('dailyLogs', cached);
      
      return log;
    }
    return null;
  } catch (error) {
    console.error('Error getting daily log from Firestore:', error);
    // Fallback to cache
    const cached = getCachedData('dailyLogs');
    if (cached && cached[date]) {
      return cached[date];
    }
    return null;
  }
}

/**
 * Get all daily logs from Firestore (with local cache fallback)
 */
export async function getAllDailyLogsFromFirestore(): Promise<Record<string, DailyLog>> {
  const user = getCurrentUser();
  if (!user) {
    const cached = getCachedData('dailyLogs');
    return cached || {};
  }

  try {
    const logsRef = collection(db, getUserPath('dailyLogs'));
    const snapshot = await getDocs(logsRef);
    const logs: Record<string, DailyLog> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      logs[doc.id] = {
        ...data,
        meals: data.meals.map((meal: any) => ({
          ...meal,
          timestamp: convertTimestamp(meal.timestamp),
          foods: meal.foods.map((mealFood: any) => ({
            ...mealFood,
            addedAt: mealFood.addedAt ? convertTimestamp(mealFood.addedAt) : undefined,
          })),
        })),
      } as DailyLog;
    });

    // Cache locally
    cacheData('dailyLogs', logs);
    return logs;
  } catch (error) {
    console.error('Error getting all daily logs from Firestore:', error);
    // Fallback to cache
    const cached = getCachedData('dailyLogs');
    return cached || {};
  }
}

/**
 * Subscribe to real-time updates for foods
 */
export function subscribeToFoods(
  callback: (foods: FoodItem[]) => void
): () => void {
  const user = getCurrentUser();
  if (!user) {
    // Return cached data if available
    getFoodsFromFirestore().then(callback);
    return () => {};
  }

  const foodsRef = collection(db, getUserPath('foods'));
  return onSnapshot(
    foodsRef,
    (snapshot) => {
      const foods: FoodItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FoodItem));
      
      // Cache locally
      cacheData('foods', foods);
      callback(foods);
    },
    (error) => {
      console.error('Error in foods subscription:', error);
      // Fallback to cache
      const cached = getCachedData('foods');
      if (cached) callback(cached);
    }
  );
}

/**
 * Subscribe to real-time updates for a daily log
 */
export function subscribeToDailyLog(
  date: string,
  callback: (log: DailyLog | null) => void
): () => void {
  const user = getCurrentUser();
  if (!user) {
    // Return cached data if available
    getDailyLogFromFirestore(date).then(callback);
    return () => {};
  }

  const logRef = doc(db, getUserPath('dailyLogs'), date);
  return onSnapshot(
    logRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const log: DailyLog = {
          ...data,
          meals: data.meals.map((meal: any) => ({
            ...meal,
            timestamp: convertTimestamp(meal.timestamp),
            foods: meal.foods.map((mealFood: any) => ({
              ...mealFood,
              addedAt: mealFood.addedAt ? convertTimestamp(mealFood.addedAt) : undefined,
            })),
          })),
        } as DailyLog;

        // Cache locally
        const cached = getCachedData('dailyLogs') || {};
        cached[date] = log;
        cacheData('dailyLogs', cached);
        
        callback(log);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in daily log subscription:', error);
      // Fallback to cache
      const cached = getCachedData('dailyLogs');
      if (cached && cached[date]) {
        callback(cached[date]);
      } else {
        callback(null);
      }
    }
  );
}

/**
 * Sync local cache to Firestore (for offline-first support)
 */
export async function syncLocalCacheToFirestore(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Sync foods
    const cachedFoods = getCachedData('foods');
    if (cachedFoods && Array.isArray(cachedFoods)) {
      const batch = writeBatch(db);
      cachedFoods.forEach((food: FoodItem) => {
        const foodRef = doc(db, getUserPath('foods'), food.id);
        batch.set(foodRef, {
          ...food,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });
      await batch.commit();
    }

    // Sync daily logs
    const cachedLogs = getCachedData('dailyLogs');
    if (cachedLogs && typeof cachedLogs === 'object') {
      const batch = writeBatch(db);
      Object.keys(cachedLogs).forEach(date => {
        const log = cachedLogs[date] as DailyLog;
        const logRef = doc(db, getUserPath('dailyLogs'), date);
        batch.set(logRef, {
          ...log,
          meals: log.meals.map(meal => ({
            ...meal,
            timestamp: toTimestamp(meal.timestamp),
            foods: meal.foods.map(mealFood => ({
              ...mealFood,
              addedAt: toTimestamp(mealFood.addedAt),
            })),
          })),
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error syncing local cache to Firestore:', error);
    throw error;
  }
}

/**
 * Clear all local cache data
 * This should be called on logout to ensure user data is properly cleared
 */
export function clearLocalCache(): void {
  try {
    // Get all keys with our cache prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all cache keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also remove the sync timestamp
    localStorage.removeItem(SYNC_TIMESTAMP_KEY);
    
    console.log('Local cache cleared successfully');
  } catch (error) {
    console.error('Error clearing local cache:', error);
  }
}
