/**
 * Daily Log Repository Implementation
 * Provides CRUD operations for daily logs with meal tracking
 */

import type { DailyLog, Meal, MealFood, MacroTargets, Recipe } from '../index';
import { calculateMacros, scaleMacros, createEmptyMacros } from '../index';
import type { IDailyLogRepository, RepositoryContext, FirestoreAdapter } from './types';
import type { StorageAdapter } from '../index';

const DAILY_LOGS_STORAGE_KEY = '@meal_planning:daily_logs';

// Default macro targets if none are set
const DEFAULT_MACRO_TARGETS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

export class DailyLogRepository implements IDailyLogRepository {
  private storage: StorageAdapter;
  private firestore: FirestoreAdapter | null;
  private context: RepositoryContext;
  private targetMacros: MacroTargets;

  constructor(
    storage: StorageAdapter,
    context: RepositoryContext,
    firestore: FirestoreAdapter | null = null,
    targetMacros: MacroTargets = DEFAULT_MACRO_TARGETS
  ) {
    this.storage = storage;
    this.context = context;
    this.firestore = firestore;
    this.targetMacros = targetMacros;
  }

  /**
   * Get the Firestore collection path for the current user's daily logs
   */
  private getCollectionPath(): string | null {
    const userId = this.context.getUserId();
    if (!userId) return null;
    return `users/${userId}/dailyLogs`;
  }

  /**
   * Get all logs from local storage
   */
  private async getLocalLogs(): Promise<Record<string, DailyLog>> {
    try {
      const logsJson = await this.storage.getItem(DAILY_LOGS_STORAGE_KEY);
      if (!logsJson) return {};

      const logs = JSON.parse(logsJson);
      // Deserialize each log
      const result: Record<string, DailyLog> = {};
      for (const date in logs) {
        result[date] = this.deserializeLog(logs[date]);
      }
      return result;
    } catch (error) {
      console.error('Error getting local logs:', error);
      return {};
    }
  }

  /**
   * Save logs to local storage
   */
  private async saveLocalLogs(logs: Record<string, DailyLog>): Promise<void> {
    const serialized: Record<string, unknown> = {};
    for (const date in logs) {
      serialized[date] = this.serializeLog(logs[date]);
    }
    await this.storage.setItem(DAILY_LOGS_STORAGE_KEY, JSON.stringify(serialized));
  }

  /**
   * Serialize a daily log for storage (convert Dates to strings)
   */
  private serializeLog(log: DailyLog): Record<string, unknown> {
    return {
      ...log,
      updatedAt: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt,
      meals: log.meals.map((meal) => ({
        ...meal,
        timestamp: meal.timestamp instanceof Date ? meal.timestamp.toISOString() : meal.timestamp,
        foods: meal.foods.map((mealFood) => ({
          ...mealFood,
          addedAt:
            mealFood.addedAt instanceof Date ? mealFood.addedAt.toISOString() : mealFood.addedAt,
        })),
      })),
    };
  }

  /**
   * Deserialize a daily log from storage (convert strings to Dates)
   */
  private deserializeLog(log: Record<string, unknown>): DailyLog {
    const l = log as unknown as DailyLog;
    return {
      ...l,
      updatedAt: typeof l.updatedAt === 'string' ? new Date(l.updatedAt) : l.updatedAt,
      meals: l.meals.map((meal) => ({
        ...meal,
        timestamp:
          typeof meal.timestamp === 'string' ? new Date(meal.timestamp) : meal.timestamp,
        foods: meal.foods.map((mealFood) => ({
          ...mealFood,
          addedAt:
            typeof mealFood.addedAt === 'string' ? new Date(mealFood.addedAt) : mealFood.addedAt,
        })),
      })),
    };
  }

  /**
   * Recalculate total macros for a daily log
   */
  private recalculateTotalMacros(log: DailyLog): void {
    const allFoods: MealFood[] = log.meals.flatMap((meal) => meal.foods);
    log.totalMacros = calculateMacros(allFoods);
  }

  /**
   * Get a log by ID (date string)
   */
  async getById(id: string): Promise<DailyLog | null> {
    return this.getByDate(id);
  }

  /**
   * Get all logs
   */
  async getAll(): Promise<DailyLog[]> {
    const logs = await this.getLocalLogs();
    return Object.values(logs);
  }

  /**
   * Save a log
   */
  async save(log: DailyLog): Promise<void> {
    // Update timestamps
    log.updatedAt = new Date();

    // Recalculate total macros
    this.recalculateTotalMacros(log);

    // Save to local storage
    const logs = await this.getLocalLogs();
    logs[log.date] = log;
    await this.saveLocalLogs(logs);

    // Sync to Firestore
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      const serialized = this.serializeLog(log);
      this.firestore.setDoc(collectionPath, log.date, serialized).catch((error) => {
        console.error('Error saving daily log to Firestore:', error);
      });
    }
  }

  /**
   * Delete a log by ID (date string)
   */
  async delete(id: string): Promise<void> {
    const logs = await this.getLocalLogs();
    delete logs[id];
    await this.saveLocalLogs(logs);

    // Delete from Firestore
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      this.firestore.deleteDoc(collectionPath, id).catch((error) => {
        console.error('Error deleting daily log from Firestore:', error);
      });
    }
  }

  /**
   * Get log for a specific date
   */
  async getByDate(date: string): Promise<DailyLog | null> {
    // Check local cache first
    const logs = await this.getLocalLogs();
    let log = logs[date];

    // If not found locally, try Firestore
    if (!log) {
      const collectionPath = this.getCollectionPath();
      if (this.firestore && collectionPath) {
        try {
          const doc = await this.firestore.getDoc<DailyLog>(collectionPath, date);
          if (doc && doc.exists()) {
            log = this.deserializeLog({ date, ...doc.data() } as Record<string, unknown>);
            // Update local cache
            logs[date] = log;
            await this.saveLocalLogs(logs);
          }
        } catch (error) {
          console.error('Error getting daily log from Firestore:', error);
        }
      }
    }

    // If still no log, create an empty one for the date
    if (!log) {
      log = {
        date,
        meals: [],
        totalMacros: createEmptyMacros(),
        targetMacros: this.targetMacros,
      };
    }

    // Ensure targetMacros is set
    if (!log.targetMacros) {
      log.targetMacros = this.targetMacros;
    }

    return log;
  }

  /**
   * Add a meal to a date's log
   */
  async addMeal(date: string, meal: Meal): Promise<void> {
    const log = await this.getByDate(date);
    if (!log) return;

    // Ensure meal has timestamp
    if (!meal.timestamp) {
      meal.timestamp = new Date();
    }

    // Calculate meal macros if not set
    if (!meal.macros) {
      meal.macros = calculateMacros(meal.foods);
    }

    log.meals.push(meal);
    await this.save(log);
  }

  /**
   * Add a recipe as a meal to a date's log
   */
  async addRecipeAsMeal(
    date: string,
    recipe: Recipe,
    servings: number,
    mealName: string
  ): Promise<void> {
    // Scale macros by serving count
    const scaledMacros = scaleMacros(recipe.macros, servings);

    // Convert recipe ingredients to meal foods
    const foods: MealFood[] = recipe.ingredients.map((ing) => ({
      foodId: ing.foodId,
      food: ing.food,
      quantity: ing.quantity * servings,
      addedAt: new Date(),
    }));

    // Create meal with recipe reference
    const meal: Meal = {
      id: this.context.generateId(),
      name: mealName,
      foods,
      timestamp: new Date(),
      macros: scaledMacros,
      recipeId: recipe.id,
      recipeServings: servings,
    };

    await this.addMeal(date, meal);
  }

  /**
   * Update a meal in a date's log
   */
  async updateMeal(date: string, mealId: string, meal: Meal): Promise<void> {
    const log = await this.getByDate(date);
    if (!log) return;

    const mealIndex = log.meals.findIndex((m) => m.id === mealId);
    if (mealIndex >= 0) {
      // Recalculate meal macros
      meal.macros = calculateMacros(meal.foods);
      log.meals[mealIndex] = meal;
      await this.save(log);
    }
  }

  /**
   * Remove a meal from a date's log
   */
  async removeMeal(date: string, mealId: string): Promise<void> {
    const log = await this.getByDate(date);
    if (!log) return;

    log.meals = log.meals.filter((m) => m.id !== mealId);
    await this.save(log);
  }

  /**
   * Get the user's default target macros
   */
  async getDefaultTargetMacros(): Promise<MacroTargets> {
    return this.targetMacros;
  }

  /**
   * Set default target macros for new logs
   */
  setDefaultTargetMacros(targets: MacroTargets): void {
    this.targetMacros = targets;
  }
}
