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

