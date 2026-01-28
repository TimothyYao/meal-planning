/**
 * Storage module - exports all storage-related functions
 * 
 * This module provides a unified interface for local storage operations
 * with automatic Firestore synchronization when authenticated.
 */

// Utilities
export { generateFoodId, getTodayDate, clearAllCaches } from './utils';

// Food operations (legacy - kept for backward compatibility)
export {
  saveFood,
  getFoods,
  getFoodById,
  deleteFood,
} from './foods';

// Daily log operations (legacy - kept for backward compatibility)
export {
  addFoodToDate,
  addFoodToToday,
  getTodayLog,
  getLogForDate,
  reorderFoodsInMeal,
  removeFoodFromDate,
  removeFoodFromToday,
  moveFoodToDate,
  updateFoodQuantityInDate,
  updateFoodInLogEntry,
  getRecentFoods,
} from './dailyLogs';
export type { MoveFoodResult } from './dailyLogs';

// Macro operations
export {
  setTodayTargetMacros,
  getUserTargetMacros,
  syncToFirestore,
  saveLastProtein,
  getLastProtein,
  saveLastCarbs,
  getLastCarbs,
  saveLastFat,
  getLastFat,
  saveLastDate,
  getLastDate,
} from './macros';

// New repository-based API (recommended for new code)
export {
  createFoodRepository,
  createRecipeRepository,
  createDailyLogRepository,
  getFoodRepository,
  getRecipeRepository,
  getDailyLogRepository,
  resetRepositories,
} from './repositories';

// Adapters for custom repository configurations
export {
  asyncStorageAdapter,
  mobileFirestoreAdapter,
  mobileRepositoryContext,
} from './adapters';
