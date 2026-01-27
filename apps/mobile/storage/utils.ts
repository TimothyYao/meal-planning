import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DAILY_LOGS_KEY,
  FOODS_KEY,
  LAST_PROTEIN_KEY,
  LAST_CARBS_KEY,
  LAST_FAT_KEY,
  LAST_DATE_KEY,
  RECENT_FOODS_CACHE_KEY,
} from './constants';

/**
 * Generate a UUID for food items
 */
export async function generateFoodId(): Promise<string> {
  return Crypto.randomUUID();
}

/**
 * Get today's date in YYYY-MM-DD format (using local time, not UTC)
 */
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Clear all cached data from AsyncStorage
 * This should be called on logout to ensure user data is properly cleared
 * and the next user starts with a clean slate.
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // List of all storage keys used by the app
    const keysToRemove = [
      DAILY_LOGS_KEY,
      FOODS_KEY,
      LAST_PROTEIN_KEY,
      LAST_CARBS_KEY,
      LAST_FAT_KEY,
      LAST_DATE_KEY,
      RECENT_FOODS_CACHE_KEY,
    ];

    // Remove all keys in parallel for better performance
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('All local caches cleared successfully');
  } catch (error) {
    console.error('Error clearing all caches:', error);
    throw error;
  }
}
