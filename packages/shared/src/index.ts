// Shared types for meal planning app

export interface MacroTargets {
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  macros: MacroTargets;
  servingSize: number; // in grams
  servingUnit: string; // "g", "ml", "piece", etc.
  tags?: string[];
  source?: string; // "USDA", "OpenFoodFacts", "user"
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Meal {
  id: string;
  name: string;
  foods: MealFood[];
  timestamp: Date;
  macros: MacroTargets;
  recipeId?: string; // Reference to the recipe if this meal was created from a recipe
  recipeServings?: number; // Number of servings used from the recipe
}

export interface MealFood {
  food: FoodItem; // embedded snapshot of the food
  quantity: number; // multiplier of servingSize
  addedAt?: Date; // timestamp when food was added to the meal
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  totalMacros: MacroTargets;
  targetMacros: MacroTargets;
  updatedAt?: Date;
}

/**
 * An ingredient within a recipe. Structure mirrors MealFood for consistency.
 */
export interface RecipeIngredient {
  foodId: string;
  food: FoodItem; // Embedded snapshot for denormalization
  quantity: number; // multiplier of servingSize
  notes?: string; // e.g., "chopped", "diced"
  addedAt?: Date;
}

/**
 * Recipe with ingredients that can be reused for meal tracking.
 * Per-serving macros are calculated from ingredients.
 */
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  servings: number; // default serving count
  macros: MacroTargets; // calculated per serving
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  tags?: string[];
  imageUrl?: string;
  isPublic?: boolean;
  createdBy?: string; // user ID
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  goal?: 'lose' | 'maintain' | 'gain';
  targetMacros: MacroTargets;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ============================================
// Food Sharing Types
// ============================================

/**
 * Permission levels for shared foods
 */
export type SharePermission = 'view' | 'copy';

/**
 * Status of a food share
 */
export type ShareStatus = 'pending' | 'active' | 'revoked';

/**
 * Status of a share invite
 */
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Represents a sharing permission granted to another user for a food item.
 */
export interface FoodShare {
  id: string;
  foodId: string;
  ownerId: string;
  sharedWithUserId: string;
  sharedWithEmail?: string;
  permission: SharePermission;
  status: ShareStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  note?: string;
}

/**
 * A shareable invite code for foods that can be used by multiple users.
 */
export interface ShareInvite {
  id: string;
  code: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName?: string;
  foodIds: string[];
  permission: SharePermission;
  status: InviteStatus;
  maxUses: number;
  useCount: number;
  usedBy: string[];
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Denormalized view of a shared food stored in the recipient's subcollection.
 */
export interface SharedFoodAccess {
  id: string;
  foodId: string;
  ownerId: string;
  ownerEmail?: string;
  ownerDisplayName?: string;
  food: FoodItem;
  permission: SharePermission;
  sharedAt: Date;
  expiresAt?: Date;
}

/**
 * Options for sharing a food with another user
 */
export interface ShareOptions {
  permission: SharePermission;
  expiresAt?: Date;
  note?: string;
}

/**
 * Options for creating a share invite
 */
export interface InviteOptions {
  permission: SharePermission;
  expiresAt?: Date;
  maxUses?: number;
}

/**
 * Result of a share operation
 */
export interface ShareResult {
  success: boolean;
  shareId?: string;
  inviteId?: string;
  error?: string;
}

/**
 * Preview information for a share invite
 */
export interface InvitePreview {
  ownerDisplayName: string;
  ownerEmail?: string;
  foods: Array<{ name: string; macros: MacroTargets }>;
  permission: SharePermission;
  expiresAt: Date;
  remainingUses: number;
}

/**
 * Result of accepting a share invite
 */
export interface AcceptInviteResult {
  success: boolean;
  foodsAdded: number;
  error?: string;
}

/**
 * Notification types for sharing events
 */
export type ShareNotificationType = 
  | 'food_shared'
  | 'invite_accepted'
  | 'share_revoked'
  | 'invite_expiring';

/**
 * Notification data for sharing events
 */
export interface ShareNotification {
  id: string;
  userId: string;
  type: ShareNotificationType;
  title: string;
  message: string;
  data: {
    foodId?: string;
    shareId?: string;
    inviteCode?: string;
    ownerId?: string;
    ownerName?: string;
  };
  read: boolean;
  createdAt: Date;
}

// Utility functions
export function calculateMacros(foods: MealFood[]): MacroTargets {
  return foods.reduce(
    (total, mealFood) => {
      const multiplier = mealFood.quantity;
      return {
        calories: total.calories + mealFood.food.macros.calories * multiplier,
        protein: total.protein + mealFood.food.macros.protein * multiplier,
        carbs: total.carbs + mealFood.food.macros.carbs * multiplier,
        fat: total.fat + mealFood.food.macros.fat * multiplier,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculate total macros from recipe ingredients
 */
export function calculateRecipeIngredientsMacros(ingredients: RecipeIngredient[]): MacroTargets {
  return ingredients.reduce(
    (total, ingredient) => {
      const multiplier = ingredient.quantity;
      return {
        calories: total.calories + ingredient.food.macros.calories * multiplier,
        protein: total.protein + ingredient.food.macros.protein * multiplier,
        carbs: total.carbs + ingredient.food.macros.carbs * multiplier,
        fat: total.fat + ingredient.food.macros.fat * multiplier,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculate per-serving macros for a recipe
 */
export function calculateRecipePerServingMacros(ingredients: RecipeIngredient[], servings: number): MacroTargets {
  const totalMacros = calculateRecipeIngredientsMacros(ingredients);
  return {
    calories: totalMacros.calories / servings,
    protein: totalMacros.protein / servings,
    carbs: totalMacros.carbs / servings,
    fat: totalMacros.fat / servings,
  };
}

/**
 * Scale macros by a multiplier (e.g., for serving count)
 */
export function scaleMacros(macros: MacroTargets, multiplier: number): MacroTargets {
  return {
    calories: macros.calories * multiplier,
    protein: macros.protein * multiplier,
    carbs: macros.carbs * multiplier,
    fat: macros.fat * multiplier,
  };
}

/**
 * Create empty macros
 */
export function createEmptyMacros(): MacroTargets {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function formatMacroValue(value: number, unit: 'calories' | 'grams'): string {
  if (unit === 'calories') {
    return `${Math.round(value)} cal`;
  }
  return `${Math.round(value * 10) / 10}g`;
}

/**
 * Calculate total calories from macronutrients
 * Protein: 4 calories per gram
 * Carbs: 4 calories per gram
 * Fat: 9 calories per gram
 */
export function calculateCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/**
 * Convert Firebase User to AuthUser
 * This is a type-safe conversion that works with Firebase User objects
 */
export function convertFirebaseUser(user: { uid: string; email: string | null; phoneNumber: string | null; displayName: string | null; photoURL: string | null } | null): AuthUser | null {
  if (!user) return null;
  
  return {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Serialize a DailyLog for storage (converts Date objects to ISO strings)
 */
export function serializeDailyLog(log: DailyLog): Record<string, any> {
  return {
    ...log,
    meals: log.meals.map((meal) => ({
      ...meal,
      timestamp: meal.timestamp instanceof Date 
        ? meal.timestamp.toISOString() 
        : (typeof meal.timestamp === 'string' ? meal.timestamp : new Date().toISOString()),
      foods: meal.foods.map((mealFood) => ({
        ...mealFood,
        addedAt: mealFood.addedAt instanceof Date 
          ? mealFood.addedAt.toISOString() 
          : (typeof mealFood.addedAt === 'string' ? mealFood.addedAt : (mealFood.addedAt ? new Date().toISOString() : undefined)),
      })),
    })),
  };
}

/**
 * Deserialize a DailyLog from storage (converts ISO strings to Date objects)
 */
export function deserializeDailyLog(log: any): DailyLog {
  return {
    ...log,
    meals: log.meals.map((meal: any) => ({
      ...meal,
      timestamp: typeof meal.timestamp === 'string' 
        ? new Date(meal.timestamp) 
        : (meal.timestamp instanceof Date ? meal.timestamp : new Date()),
      foods: meal.foods.map((mealFood: any) => ({
        ...mealFood,
        addedAt: typeof mealFood.addedAt === 'string' 
          ? new Date(mealFood.addedAt) 
          : (mealFood.addedAt instanceof Date ? mealFood.addedAt : undefined),
      })),
    })),
  };
}

/**
 * Storage abstraction interface for platform-agnostic storage operations
 * This allows mobile (AsyncStorage) and web (localStorage) to share the same API
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Design tokens
export * from './tokens';

// Repositories
export * from './repositories';

