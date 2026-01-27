/**
 * Food Repository Implementation
 * Provides CRUD operations for food items with cache-first strategy
 */

import type { FoodItem } from '../index';
import type { IFoodRepository, RepositoryContext, FirestoreAdapter } from './types';
import type { StorageAdapter } from '../index';

const FOODS_STORAGE_KEY = '@meal_planning:foods';

export class FoodRepository implements IFoodRepository {
  private storage: StorageAdapter;
  private firestore: FirestoreAdapter | null;
  private context: RepositoryContext;

  constructor(
    storage: StorageAdapter,
    context: RepositoryContext,
    firestore: FirestoreAdapter | null = null
  ) {
    this.storage = storage;
    this.context = context;
    this.firestore = firestore;
  }

  /**
   * Get the Firestore collection path for the current user's foods
   */
  private getCollectionPath(): string | null {
    const userId = this.context.getUserId();
    if (!userId) return null;
    return `users/${userId}/foods`;
  }

  /**
   * Get all foods from local storage
   */
  private async getLocalFoods(): Promise<FoodItem[]> {
    try {
      const foodsJson = await this.storage.getItem(FOODS_STORAGE_KEY);
      if (!foodsJson) return [];
      
      // Parse and convert date strings back to Date objects
      const foods = JSON.parse(foodsJson) as FoodItem[];
      return foods.map((food) => this.deserializeFood(food));
    } catch (error) {
      console.error('Error getting local foods:', error);
      return [];
    }
  }

  /**
   * Deserialize a food item from storage (convert strings to Dates)
   */
  private deserializeFood(food: FoodItem): FoodItem {
    return {
      ...food,
      createdAt: typeof food.createdAt === 'string' ? new Date(food.createdAt) : food.createdAt,
      updatedAt: typeof food.updatedAt === 'string' ? new Date(food.updatedAt) : food.updatedAt,
    };
  }

  /**
   * Save foods to local storage
   */
  private async saveLocalFoods(foods: FoodItem[]): Promise<void> {
    await this.storage.setItem(FOODS_STORAGE_KEY, JSON.stringify(foods));
  }

  /**
   * Get a food by ID
   */
  async getById(id: string): Promise<FoodItem | null> {
    // Check local cache first
    const localFoods = await this.getLocalFoods();
    const cachedFood = localFoods.find((f) => f.id === id);
    if (cachedFood) {
      return cachedFood;
    }

    // If not in cache and Firestore is available, try fetching from there
    const collectionPath = this.getCollectionPath();
      if (this.firestore && collectionPath) {
      try {
        const doc = await this.firestore.getDoc<FoodItem>(collectionPath, id);
        if (doc && doc.exists()) {
          const docData = doc.data();
          const food = { ...docData, id: doc.id } as FoodItem;
          // Update local cache
          const foods = await this.getLocalFoods();
          const existingIndex = foods.findIndex((f) => f.id === id);
          if (existingIndex >= 0) {
            foods[existingIndex] = food;
          } else {
            foods.push(food);
          }
          await this.saveLocalFoods(foods);
          return food;
        }
      } catch (error) {
        console.error('Error getting food from Firestore:', error);
      }
    }

    return null;
  }

  /**
   * Get all foods
   */
  async getAll(): Promise<FoodItem[]> {
    // Return local cache first
    const localFoods = await this.getLocalFoods();

    // If authenticated, sync from Firestore in background
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      // Fire and forget - sync in background
      this.syncFromFirestore(localFoods).catch((error) => {
        console.error('Error syncing foods from Firestore:', error);
      });
    }

    return localFoods;
  }

  /**
   * Sync foods from Firestore and merge with local cache
   */
  private async syncFromFirestore(localFoods: FoodItem[]): Promise<void> {
    const collectionPath = this.getCollectionPath();
    if (!this.firestore || !collectionPath) return;

    try {
      const firestoreDocs = await this.firestore.getDocs<FoodItem>(collectionPath);
      const mergedFoods = [...localFoods];

      for (const doc of firestoreDocs) {
        const food = { ...doc.data, id: doc.id } as FoodItem;
        const existingIndex = mergedFoods.findIndex((f) => f.id === food.id);
        if (existingIndex >= 0) {
          // Keep the one with the most recent updatedAt, or Firestore version if no timestamps
          mergedFoods[existingIndex] = food;
        } else {
          mergedFoods.push(food);
        }
      }

      await this.saveLocalFoods(mergedFoods);
    } catch (error) {
      console.error('Error syncing from Firestore:', error);
    }
  }

  /**
   * Save a food (create or update)
   */
  async save(food: FoodItem): Promise<void> {
    // Update timestamps
    const now = new Date();
    const foodToSave: FoodItem = {
      ...food,
      updatedAt: now,
      createdAt: food.createdAt || now,
    };

    // Save to local storage first (cache-first)
    const foods = await this.getLocalFoods();
    const existingIndex = foods.findIndex((f) => f.id === food.id);
    if (existingIndex >= 0) {
      foods[existingIndex] = foodToSave;
    } else {
      foods.push(foodToSave);
    }
    await this.saveLocalFoods(foods);

    // Then sync to Firestore (async, non-blocking)
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      this.firestore.setDoc(collectionPath, food.id, foodToSave).catch((error) => {
        console.error('Error saving food to Firestore:', error);
      });
    }
  }

  /**
   * Delete a food by ID
   */
  async delete(id: string): Promise<void> {
    // Remove from local storage
    const foods = await this.getLocalFoods();
    const filteredFoods = foods.filter((f) => f.id !== id);
    await this.saveLocalFoods(filteredFoods);

    // Remove from Firestore
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      this.firestore.deleteDoc(collectionPath, id).catch((error) => {
        console.error('Error deleting food from Firestore:', error);
      });
    }
  }

  /**
   * Search foods by name (case-insensitive partial match)
   */
  async searchByName(query: string): Promise<FoodItem[]> {
    const foods = await this.getLocalFoods();
    const lowerQuery = query.toLowerCase();
    return foods.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        (f.brand && f.brand.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get a food by barcode
   */
  async getByBarcode(barcode: string): Promise<FoodItem | null> {
    const foods = await this.getLocalFoods();
    return foods.find((f) => f.barcode === barcode) || null;
  }

  /**
   * Get recent foods sorted by createdAt/updatedAt
   */
  async getRecent(limit: number = 10): Promise<FoodItem[]> {
    const foods = await this.getLocalFoods();
    return foods
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt || new Date(0);
        const dateB = b.updatedAt || b.createdAt || new Date(0);
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, limit);
  }
}
