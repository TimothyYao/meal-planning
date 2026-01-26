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
}

export interface Meal {
  id: string;
  name: string;
  foods: MealFood[];
  timestamp: Date;
  macros: MacroTargets;
}

export interface MealFood {
  foodId: string;
  food: FoodItem;
  quantity: number; // multiplier of servingSize
  addedAt?: Date; // timestamp when food was added to the meal
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  totalMacros: MacroTargets;
  targetMacros: MacroTargets;
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

