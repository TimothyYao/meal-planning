/**
 * Repository instances for the mobile app
 * These use the shared package repositories with mobile-specific adapters
 */

import {
  FoodRepository,
  RecipeRepository,
  DailyLogRepository,
  type MacroTargets,
} from '@meal-planning/shared';
import { asyncStorageAdapter } from './adapters/AsyncStorageAdapter';
import { mobileFirestoreAdapter } from './adapters/FirestoreAdapter';
import { mobileRepositoryContext } from './adapters/RepositoryContext';
import { getCurrentUser } from '../utils/auth';

/**
 * Create a FoodRepository instance
 * Returns a repository that uses local storage and optionally Firestore
 */
export function createFoodRepository(): FoodRepository {
  const user = getCurrentUser();
  const firestoreAdapter = user ? mobileFirestoreAdapter : null;
  
  return new FoodRepository(asyncStorageAdapter, mobileRepositoryContext, firestoreAdapter);
}

/**
 * Create a RecipeRepository instance
 * Returns a repository that uses local storage and optionally Firestore
 */
export function createRecipeRepository(): RecipeRepository {
  const user = getCurrentUser();
  const firestoreAdapter = user ? mobileFirestoreAdapter : null;
  
  return new RecipeRepository(asyncStorageAdapter, mobileRepositoryContext, firestoreAdapter);
}

/**
 * Create a DailyLogRepository instance
 * Returns a repository that uses local storage and optionally Firestore
 */
export function createDailyLogRepository(targetMacros?: MacroTargets): DailyLogRepository {
  const user = getCurrentUser();
  const firestoreAdapter = user ? mobileFirestoreAdapter : null;
  
  return new DailyLogRepository(
    asyncStorageAdapter,
    mobileRepositoryContext,
    firestoreAdapter,
    targetMacros
  );
}

// Singleton instances for convenience
// Note: These should be recreated when auth state changes
let _foodRepository: FoodRepository | null = null;
let _recipeRepository: RecipeRepository | null = null;
let _dailyLogRepository: DailyLogRepository | null = null;

/**
 * Get the food repository singleton
 * Creates a new instance if one doesn't exist
 */
export function getFoodRepository(): FoodRepository {
  if (!_foodRepository) {
    _foodRepository = createFoodRepository();
  }
  return _foodRepository;
}

/**
 * Get the recipe repository singleton
 * Creates a new instance if one doesn't exist
 */
export function getRecipeRepository(): RecipeRepository {
  if (!_recipeRepository) {
    _recipeRepository = createRecipeRepository();
  }
  return _recipeRepository;
}

/**
 * Get the daily log repository singleton
 * Creates a new instance if one doesn't exist
 */
export function getDailyLogRepository(targetMacros?: MacroTargets): DailyLogRepository {
  if (!_dailyLogRepository) {
    _dailyLogRepository = createDailyLogRepository(targetMacros);
  }
  return _dailyLogRepository;
}

/**
 * Reset all repository singletons
 * Call this when the user logs in or out to recreate repositories with correct Firestore access
 */
export function resetRepositories(): void {
  _foodRepository = null;
  _recipeRepository = null;
  _dailyLogRepository = null;
}
