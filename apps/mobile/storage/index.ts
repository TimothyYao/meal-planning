/**
 * Storage module - exports all storage-related functions
 * 
 * This module provides a unified interface for local storage operations
 * with automatic Firestore synchronization when authenticated.
 */

// Utilities
export { generateFoodId, getTodayDate } from './utils';

// Food operations
export {
  saveFood,
  getFoods,
  getFoodById,
  deleteFood,
} from './foods';

// Daily log operations
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
  getRecentFoods,
} from './dailyLogs';

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
