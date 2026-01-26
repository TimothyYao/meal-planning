import AsyncStorage from '@react-native-async-storage/async-storage';
import { MacroTargets, DailyLog } from '@meal-planning/shared';
import { getCurrentUser } from '../utils/auth';
import { saveDailyLogToFirestore, syncLocalCacheToFirestore } from '../utils/firestore';
import { DAILY_LOGS_KEY, LAST_PROTEIN_KEY, LAST_CARBS_KEY, LAST_FAT_KEY } from './constants';
import { getTodayDate } from './utils';

/**
 * Set target macros for today
 */
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
    
    // If authenticated, also save to Firestore
    const user = getCurrentUser();
    if (user) {
      try {
        await saveDailyLogToFirestore(logs[today]);
      } catch (error) {
        console.error('Error saving target macros to Firestore:', error);
        // Continue even if Firestore save fails
      }
    }
  } catch (error) {
    console.error('Error setting target macros:', error);
    throw error;
  }
}

/**
 * Sync local data to Firestore (useful when coming back online)
 */
export async function syncToFirestore(): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) return;
    
    await syncLocalCacheToFirestore();
  } catch (error) {
    console.error('Error syncing to Firestore:', error);
    throw error;
  }
}

/**
 * Save last protein value
 */
export async function saveLastProtein(protein: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PROTEIN_KEY, protein.toString());
  } catch (error) {
    console.error('Error saving last protein:', error);
  }
}

/**
 * Get last protein value
 */
export async function getLastProtein(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_PROTEIN_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last protein:', error);
    return null;
  }
}

/**
 * Save last carbs value
 */
export async function saveLastCarbs(carbs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_CARBS_KEY, carbs.toString());
  } catch (error) {
    console.error('Error saving last carbs:', error);
  }
}

/**
 * Get last carbs value
 */
export async function getLastCarbs(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_CARBS_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last carbs:', error);
    return null;
  }
}

/**
 * Save last fat value
 */
export async function saveLastFat(fat: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_FAT_KEY, fat.toString());
  } catch (error) {
    console.error('Error saving last fat:', error);
  }
}

/**
 * Get last fat value
 */
export async function getLastFat(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_FAT_KEY);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error('Error getting last fat:', error);
    return null;
  }
}
