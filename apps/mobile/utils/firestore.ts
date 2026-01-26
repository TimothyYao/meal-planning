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
import { db, auth } from '../config/firebase';
import { getCurrentUser } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem, DailyLog, MealFood, Meal, MacroTargets } from '@meal-planning/shared';

export interface UserProfileData {
  displayName?: string;
  photoURL?: string;
  targetMacros?: MacroTargets;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  goal?: 'lose' | 'maintain' | 'gain';
  updatedAt?: Date;
}

const CACHE_PREFIX = '@firestore_cache:';
const SYNC_TIMESTAMP_KEY = '@firestore_sync_timestamp';

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
  if (!timestamp) {
    return new Date();
  }
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    const date = timestamp.toDate();
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }
  }
  if (timestamp instanceof Date) {
    if (!isNaN(timestamp.getTime())) {
      return timestamp;
    }
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Fallback to current date if all conversions fail
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
async function cacheData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

/**
 * Get cached data
 */
async function getCachedData(key: string): Promise<any | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
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
  await cacheData('foods', foods);
}

/**
 * Get all foods from Firestore (with local cache fallback)
 */
export async function getFoodsFromFirestore(): Promise<FoodItem[]> {
  const user = getCurrentUser();
  if (!user) {
    // Return cached data if available
    const cached = await getCachedData('foods');
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
    await cacheData('foods', foods);
    return foods;
  } catch (error) {
    console.error('Error getting foods from Firestore:', error);
    // Fallback to cache
    const cached = await getCachedData('foods');
    return cached || [];
  }
}

/**
 * Get a food by ID from Firestore
 */
export async function getFoodByIdFromFirestore(foodId: string): Promise<FoodItem | null> {
  const user = getCurrentUser();
  if (!user) {
    const cached = await getCachedData('foods');
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
    const cached = await getCachedData('foods');
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
  const cached = await getCachedData('dailyLogs') || {};
  cached[log.date] = log;
  await cacheData('dailyLogs', cached);
}

/**
 * Get a daily log from Firestore (with local cache fallback)
 */
export async function getDailyLogFromFirestore(date: string): Promise<DailyLog | null> {
  const user = getCurrentUser();
  if (!user) {
    const cached = await getCachedData('dailyLogs');
    if (cached && cached[date]) {
      return cached[date];
    }
    return null;
  }

  try {
    // Verify auth token is available and refresh if needed
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(true); // Force refresh to ensure token is valid
      } catch (tokenError) {
        console.warn('Error refreshing auth token:', tokenError);
      }
    }
    
    const logRef = doc(db, getUserPath('dailyLogs'), date);
    const path = getUserPath('dailyLogs');
    const fullPath = `users/${user.uid}/dailyLogs/${date}`;
    console.log('Fetching daily log from Firestore:', { 
      path, 
      fullPath,
      date, 
      userId: user.uid,
      hasAuthToken: !!auth.currentUser,
    });
    
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
      const cached = await getCachedData('dailyLogs') || {};
      cached[date] = log;
      await cacheData('dailyLogs', cached);
      
      return log;
    }
    return null;
  } catch (error: any) {
    console.error('Error getting daily log from Firestore:', error);
    if (error?.code === 'permission-denied') {
      console.error('Permission denied - check security rules and user authentication:', {
        userId: user?.uid,
        path: getUserPath('dailyLogs'),
        date,
        errorCode: error.code,
        errorMessage: error.message,
      });
    }
    // Fallback to cache
    const cached = await getCachedData('dailyLogs');
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
    const cached = await getCachedData('dailyLogs');
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
    await cacheData('dailyLogs', logs);
    return logs;
  } catch (error) {
    console.error('Error getting all daily logs from Firestore:', error);
    // Fallback to cache
    const cached = await getCachedData('dailyLogs');
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
      getCachedData('foods').then(cached => {
        if (cached) callback(cached);
      });
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
        getCachedData('dailyLogs').then(cached => {
          const logs = cached || {};
          logs[date] = log;
          cacheData('dailyLogs', logs);
        });
        
        callback(log);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in daily log subscription:', error);
      // Fallback to cache
      getCachedData('dailyLogs').then(cached => {
        if (cached && cached[date]) {
          callback(cached[date]);
        } else {
          callback(null);
        }
      });
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
    const cachedFoods = await getCachedData('foods');
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
    const cachedLogs = await getCachedData('dailyLogs');
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
 * Save user profile data to Firestore
 */
export async function saveUserProfileToFirestore(profileData: UserProfileData): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to save profile');
  }

  try {
    const profileRef = doc(db, `users/${user.uid}/profile`, 'data');
    await setDoc(profileRef, {
      ...profileData,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile to Firestore:', error);
    throw error;
  }
}

/**
 * Get user profile data from Firestore
 */
export async function getUserProfileFromFirestore(): Promise<UserProfileData | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  try {
    const profileRef = doc(db, `users/${user.uid}/profile`, 'data');
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      return {
        displayName: data.displayName,
        photoURL: data.photoURL,
        targetMacros: data.targetMacros,
        age: data.age,
        height: data.height,
        weight: data.weight,
        goal: data.goal,
        updatedAt: data.updatedAt?.toDate(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile from Firestore:', error);
    return null;
  }
}
