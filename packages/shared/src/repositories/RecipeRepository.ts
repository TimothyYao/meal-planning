/**
 * Recipe Repository Implementation
 * Provides CRUD operations for recipes with cache-first strategy
 */

import type { Recipe, MacroTargets } from '../index';
import { calculateRecipePerServingMacros } from '../index';
import type { IRecipeRepository, RepositoryContext, FirestoreAdapter } from './types';
import type { StorageAdapter } from '../index';

const RECIPES_STORAGE_KEY = '@meal_planning:recipes';

export class RecipeRepository implements IRecipeRepository {
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
   * Get the Firestore collection path for the current user's recipes
   */
  private getCollectionPath(): string | null {
    const userId = this.context.getUserId();
    if (!userId) return null;
    return `users/${userId}/recipes`;
  }

  /**
   * Get all recipes from local storage
   */
  private async getLocalRecipes(): Promise<Recipe[]> {
    try {
      const recipesJson = await this.storage.getItem(RECIPES_STORAGE_KEY);
      if (!recipesJson) return [];
      
      // Parse and convert date strings back to Date objects
      const recipes = JSON.parse(recipesJson) as Record<string, unknown>[];
      return recipes.map((recipe) => this.deserializeRecipe(recipe));
    } catch (error) {
      console.error('Error getting local recipes:', error);
      return [];
    }
  }

  /**
   * Save recipes to local storage
   */
  private async saveLocalRecipes(recipes: Recipe[]): Promise<void> {
    // Serialize dates before saving
    const serialized = recipes.map((recipe) => this.serializeRecipe(recipe));
    await this.storage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(serialized));
  }

  /**
   * Serialize a recipe for storage (convert Dates to strings)
   */
  private serializeRecipe(recipe: Recipe): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      servings: recipe.servings,
      macros: recipe.macros,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      tags: recipe.tags,
      imageUrl: recipe.imageUrl,
      isPublic: recipe.isPublic,
      createdBy: recipe.createdBy,
      createdAt: recipe.createdAt instanceof Date ? recipe.createdAt.toISOString() : recipe.createdAt,
      updatedAt: recipe.updatedAt instanceof Date ? recipe.updatedAt.toISOString() : recipe.updatedAt,
      ingredients: recipe.ingredients.map((ing) => ({
        foodId: ing.foodId,
        quantity: ing.quantity,
        notes: ing.notes,
        addedAt: ing.addedAt instanceof Date ? ing.addedAt.toISOString() : ing.addedAt,
        food: {
          ...ing.food,
          createdAt: ing.food.createdAt instanceof Date ? ing.food.createdAt.toISOString() : ing.food.createdAt,
          updatedAt: ing.food.updatedAt instanceof Date ? ing.food.updatedAt.toISOString() : ing.food.updatedAt,
        },
      })),
    };
    return serialized;
  }

  /**
   * Deserialize a recipe from storage (convert strings to Dates)
   */
  private deserializeRecipe(data: Record<string, unknown>): Recipe {
    const recipe = data as unknown as Recipe;
    return {
      ...recipe,
      createdAt: typeof recipe.createdAt === 'string' ? new Date(recipe.createdAt) : recipe.createdAt,
      updatedAt: typeof recipe.updatedAt === 'string' ? new Date(recipe.updatedAt) : recipe.updatedAt,
      ingredients: recipe.ingredients.map((ing) => ({
        ...ing,
        addedAt: typeof ing.addedAt === 'string' ? new Date(ing.addedAt) : ing.addedAt,
        food: {
          ...ing.food,
          createdAt: typeof ing.food.createdAt === 'string' ? new Date(ing.food.createdAt) : ing.food.createdAt,
          updatedAt: typeof ing.food.updatedAt === 'string' ? new Date(ing.food.updatedAt) : ing.food.updatedAt,
        },
      })),
    };
  }

  /**
   * Get a recipe by ID
   */
  async getById(id: string): Promise<Recipe | null> {
    // Check local cache first
    const localRecipes = await this.getLocalRecipes();
    const cachedRecipe = localRecipes.find((r) => r.id === id);
    if (cachedRecipe) {
      return cachedRecipe;
    }

    // If not in cache and Firestore is available, try fetching from there
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      try {
        const doc = await this.firestore.getDoc<Recipe>(collectionPath, id);
        if (doc && doc.exists()) {
          const docData = doc.data();
          const recipeData: Record<string, unknown> = { ...docData as object, id: doc.id };
          const recipe = this.deserializeRecipe(recipeData);
          // Update local cache
          const recipes = await this.getLocalRecipes();
          const existingIndex = recipes.findIndex((r) => r.id === id);
          if (existingIndex >= 0) {
            recipes[existingIndex] = recipe;
          } else {
            recipes.push(recipe);
          }
          await this.saveLocalRecipes(recipes);
          return recipe;
        }
      } catch (error) {
        console.error('Error getting recipe from Firestore:', error);
      }
    }

    return null;
  }

  /**
   * Get all recipes
   */
  async getAll(): Promise<Recipe[]> {
    // Return local cache first
    const localRecipes = await this.getLocalRecipes();

    // If authenticated, sync from Firestore in background
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      this.syncFromFirestore(localRecipes).catch((error) => {
        console.error('Error syncing recipes from Firestore:', error);
      });
    }

    return localRecipes;
  }

  /**
   * Sync recipes from Firestore and merge with local cache
   */
  private async syncFromFirestore(localRecipes: Recipe[]): Promise<void> {
    const collectionPath = this.getCollectionPath();
    if (!this.firestore || !collectionPath) return;

    try {
      const firestoreDocs = await this.firestore.getDocs<Recipe>(collectionPath);
      const mergedRecipes = [...localRecipes];

      for (const doc of firestoreDocs) {
        const recipeData: Record<string, unknown> = { ...doc.data as object, id: doc.id };
        const recipe = this.deserializeRecipe(recipeData);
        const existingIndex = mergedRecipes.findIndex((r) => r.id === recipe.id);
        if (existingIndex >= 0) {
          mergedRecipes[existingIndex] = recipe;
        } else {
          mergedRecipes.push(recipe);
        }
      }

      await this.saveLocalRecipes(mergedRecipes);
    } catch (error) {
      console.error('Error syncing from Firestore:', error);
    }
  }

  /**
   * Save a recipe (create or update)
   * Automatically calculates per-serving macros from ingredients
   */
  async save(recipe: Recipe): Promise<void> {
    // Calculate per-serving macros
    const macros = this.calculateMacros(recipe.ingredients, recipe.servings);

    // Update timestamps
    const now = new Date();
    const recipeToSave: Recipe = {
      ...recipe,
      macros,
      createdBy: recipe.createdBy || this.context.getUserId() || undefined,
      updatedAt: now,
      createdAt: recipe.createdAt || now,
    };

    // Save to local storage first (cache-first)
    const recipes = await this.getLocalRecipes();
    const existingIndex = recipes.findIndex((r) => r.id === recipe.id);
    if (existingIndex >= 0) {
      recipes[existingIndex] = recipeToSave;
    } else {
      recipes.push(recipeToSave);
    }
    await this.saveLocalRecipes(recipes);

    // Then sync to Firestore (async, non-blocking)
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      const serialized = this.serializeRecipe(recipeToSave);
      this.firestore.setDoc(collectionPath, recipe.id, serialized).catch((error) => {
        console.error('Error saving recipe to Firestore:', error);
      });
    }
  }

  /**
   * Delete a recipe by ID
   */
  async delete(id: string): Promise<void> {
    // Remove from local storage
    const recipes = await this.getLocalRecipes();
    const filteredRecipes = recipes.filter((r) => r.id !== id);
    await this.saveLocalRecipes(filteredRecipes);

    // Remove from Firestore
    const collectionPath = this.getCollectionPath();
    if (this.firestore && collectionPath) {
      this.firestore.deleteDoc(collectionPath, id).catch((error) => {
        console.error('Error deleting recipe from Firestore:', error);
      });
    }
  }

  /**
   * Search recipes by name or description (case-insensitive partial match)
   */
  async search(query: string): Promise<Recipe[]> {
    const recipes = await this.getLocalRecipes();
    const lowerQuery = query.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        (r.description && r.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get recipes by tags (returns recipes that have ANY of the specified tags)
   */
  async getByTags(tags: string[]): Promise<Recipe[]> {
    const recipes = await this.getLocalRecipes();
    const lowerTags = tags.map((t) => t.toLowerCase());
    return recipes.filter(
      (r) => r.tags && r.tags.some((t) => lowerTags.includes(t.toLowerCase()))
    );
  }

  /**
   * Duplicate a recipe with a new ID
   */
  async duplicate(recipeId: string, newName?: string): Promise<Recipe | null> {
    const original = await this.getById(recipeId);
    if (!original) return null;

    const now = new Date();
    const duplicated: Recipe = {
      ...original,
      id: this.context.generateId(),
      name: newName || `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      createdBy: this.context.getUserId() || undefined,
    };

    await this.save(duplicated);
    return duplicated;
  }

  /**
   * Calculate macros for ingredients (per serving)
   */
  calculateMacros(ingredients: Recipe['ingredients'], servings: number): MacroTargets {
    return calculateRecipePerServingMacros(ingredients, servings);
  }
}
