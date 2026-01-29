/**
 * Repository pattern types for meal planning app
 * These provide a clean abstraction over Firestore operations with local caching support.
 */

import type { 
  FoodItem, 
  Recipe, 
  DailyLog, 
  Meal, 
  MacroTargets,
  FoodSharingConnection,
  ShareInvite,
  ShareResult,
  AcceptResult,
  ShareCodePreview,
  SharedFood,
  SharePermission,
} from '../index';

/**
 * Firestore-like document reference for type compatibility
 */
export interface FirestoreDoc<T> {
  id: string;
  data(): T | undefined;
  exists(): boolean;
}

/**
 * Firestore-like operations interface
 * This allows us to mock Firestore in tests and support different implementations
 */
export interface FirestoreAdapter {
  /**
   * Get a document from a collection
   */
  getDoc<T>(collectionPath: string, docId: string): Promise<FirestoreDoc<T> | null>;

  /**
   * Get all documents from a collection
   */
  getDocs<T>(collectionPath: string): Promise<Array<{ id: string; data: T }>>;

  /**
   * Set (create or update) a document
   */
  setDoc<T>(collectionPath: string, docId: string, data: T): Promise<void>;

  /**
   * Delete a document
   */
  deleteDoc(collectionPath: string, docId: string): Promise<void>;

  /**
   * Query documents in a collection
   */
  queryDocs<T>(
    collectionPath: string,
    queries: Array<{ field: string; op: string; value: unknown }>
  ): Promise<Array<{ id: string; data: T }>>;
}

/**
 * Base repository interface with CRUD operations
 */
export interface Repository<T> {
  /**
   * Get an item by ID
   */
  getById(id: string): Promise<T | null>;

  /**
   * Get all items
   */
  getAll(): Promise<T[]>;

  /**
   * Save an item (create or update)
   */
  save(item: T): Promise<void>;

  /**
   * Delete an item by ID
   */
  delete(id: string): Promise<void>;
}

/**
 * Food repository interface with additional search methods
 */
export interface IFoodRepository extends Repository<FoodItem> {
  /**
   * Search foods by name
   */
  searchByName(query: string): Promise<FoodItem[]>;

  /**
   * Get a food by barcode
   */
  getByBarcode(barcode: string): Promise<FoodItem | null>;

  /**
   * Get recent foods (optionally with limit)
   */
  getRecent(limit?: number): Promise<FoodItem[]>;
}

/**
 * Recipe repository interface with additional methods
 */
export interface IRecipeRepository extends Repository<Recipe> {
  /**
   * Search recipes by name or description
   */
  search(query: string): Promise<Recipe[]>;

  /**
   * Get recipes by tags
   */
  getByTags(tags: string[]): Promise<Recipe[]>;

  /**
   * Duplicate a recipe with a new ID
   */
  duplicate(recipeId: string, newName?: string): Promise<Recipe | null>;

  /**
   * Calculate macros for ingredients (per serving)
   */
  calculateMacros(ingredients: Recipe['ingredients'], servings: number): MacroTargets;
}

/**
 * Daily log repository interface with meal tracking methods
 */
export interface IDailyLogRepository extends Repository<DailyLog> {
  /**
   * Get log for a specific date
   */
  getByDate(date: string): Promise<DailyLog | null>;

  /**
   * Add a meal to a date's log
   */
  addMeal(date: string, meal: Meal): Promise<void>;

  /**
   * Add a recipe as a meal to a date's log
   */
  addRecipeAsMeal(
    date: string,
    recipe: Recipe,
    servings: number,
    mealName: string
  ): Promise<void>;

  /**
   * Update a meal in a date's log
   */
  updateMeal(date: string, mealId: string, meal: Meal): Promise<void>;

  /**
   * Remove a meal from a date's log
   */
  removeMeal(date: string, mealId: string): Promise<void>;

  /**
   * Get the user's default target macros
   */
  getDefaultTargetMacros(): Promise<MacroTargets>;
}

/**
 * Context for repository operations
 * Provides user info and configuration
 */
export interface RepositoryContext {
  /**
   * Get current user ID, or null if not authenticated
   */
  getUserId(): string | null;

  /**
   * Generate a unique ID
   */
  generateId(): string;

  /**
   * Get current date in YYYY-MM-DD format
   */
  getCurrentDate(): string;
}

/**
 * Food sharing repository interface for managing sharing connections.
 * Users share their ENTIRE food library with other users via connections.
 */
export interface IFoodSharingRepository {
  // === Managing who I share with (outgoing) ===

  /**
   * Share my foods with another user by email.
   * If the user exists, creates a direct connection.
   * If not, creates a share invite that will link when they sign up.
   */
  shareWithUser(
    email: string,
    permission: SharePermission
  ): Promise<ShareResult>;

  /**
   * Create a share code for someone to connect with me.
   */
  createShareCode(permission: SharePermission): Promise<ShareInvite>;

  /**
   * Get list of users I'm sharing my foods with.
   */
  getSharingWith(): Promise<FoodSharingConnection[]>;

  /**
   * Stop sharing my foods with a user.
   */
  stopSharingWith(connectionId: string): Promise<void>;

  /**
   * Revoke a share code.
   */
  revokeShareCode(inviteId: string): Promise<void>;

  /**
   * Get active share codes I've created.
   */
  getActiveShareCodes(): Promise<ShareInvite[]>;

  // === Managing who shares with me (incoming) ===

  /**
   * Get list of users sharing their foods with me.
   */
  getSharedWithMe(): Promise<FoodSharingConnection[]>;

  /**
   * Preview a share code before accepting.
   */
  previewShareCode(code: string): Promise<ShareCodePreview | null>;

  /**
   * Accept a share code from another user.
   */
  acceptShareCode(code: string): Promise<AcceptResult>;

  /**
   * Leave a sharing connection (stop seeing their foods).
   */
  leaveConnection(connectionId: string): Promise<void>;

  // === Accessing shared foods ===

  /**
   * Get all foods from users sharing with me.
   */
  getSharedFoods(): Promise<SharedFood[]>;

  /**
   * Get foods from a specific user sharing with me.
   */
  getFoodsFromUser(ownerId: string): Promise<SharedFood[]>;

  /**
   * Search shared foods by name.
   */
  searchSharedFoods(query: string): Promise<SharedFood[]>;

  /**
   * Copy a shared food to my collection.
   * Only works if the connection permission allows copying.
   */
  copyFood(
    ownerId: string,
    foodId: string,
    newName?: string
  ): Promise<FoodItem>;
}
