/**
 * RecipeRepository Tests
 * Tests CRUD operations for recipes with both logged-in and logged-out scenarios
 */

import { RecipeRepository } from '../repositories/RecipeRepository';
import { MockStorageAdapter, MockFirestoreAdapter, MockRepositoryContext } from './mocks';
import type { Recipe, FoodItem, RecipeIngredient } from '../index';

describe('RecipeRepository', () => {
  let storage: MockStorageAdapter;
  let firestore: MockFirestoreAdapter;
  let contextLoggedIn: MockRepositoryContext;
  let contextLoggedOut: MockRepositoryContext;

  // Sample food items for ingredients
  const chickenFood: FoodItem = {
    id: 'food-chicken',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const riceFood: FoodItem = {
    id: 'food-rice',
    name: 'Brown Rice',
    macros: { calories: 112, protein: 2.6, carbs: 24, fat: 0.8 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const broccoliFood: FoodItem = {
    id: 'food-broccoli',
    name: 'Broccoli',
    macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    servingSize: 100,
    servingUnit: 'g',
  };

  // Sample recipe ingredients
  const chickenIngredient: RecipeIngredient = {
    foodId: 'food-chicken',
    food: chickenFood,
    quantity: 2, // 200g
    notes: 'diced',
  };

  const riceIngredient: RecipeIngredient = {
    foodId: 'food-rice',
    food: riceFood,
    quantity: 1.5, // 150g
  };

  const broccoliIngredient: RecipeIngredient = {
    foodId: 'food-broccoli',
    food: broccoliFood,
    quantity: 1, // 100g
  };

  // Sample recipes
  const sampleRecipe: Recipe = {
    id: 'recipe-123',
    name: 'Chicken Stir Fry',
    description: 'A healthy stir fry with chicken and vegetables',
    ingredients: [chickenIngredient, riceIngredient, broccoliIngredient],
    servings: 2,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, // Will be calculated
    tags: ['dinner', 'high-protein', 'meal-prep'],
  };

  const sampleRecipe2: Recipe = {
    id: 'recipe-456',
    name: 'Breakfast Oatmeal',
    description: 'Quick and healthy breakfast',
    ingredients: [riceIngredient],
    servings: 1,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    tags: ['breakfast', 'quick'],
  };

  beforeEach(() => {
    storage = new MockStorageAdapter();
    firestore = new MockFirestoreAdapter();
    contextLoggedIn = new MockRepositoryContext('user-123');
    contextLoggedOut = new MockRepositoryContext(null);
    contextLoggedIn.resetIdCounter();
    contextLoggedOut.resetIdCounter();
  });

  describe('Logged Out User (Local Storage Only)', () => {
    let repository: RecipeRepository;

    beforeEach(() => {
      repository = new RecipeRepository(storage, contextLoggedOut, null);
    });

    describe('save', () => {
      it('saves a new recipe to local storage', async () => {
        await repository.save(sampleRecipe);

        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(1);
        expect(recipes[0].id).toBe('recipe-123');
        expect(recipes[0].name).toBe('Chicken Stir Fry');
      });

      it('calculates per-serving macros when saving', async () => {
        await repository.save(sampleRecipe);

        const recipes = await repository.getAll();
        const recipe = recipes[0];

        // Expected total macros:
        // Chicken: 165 * 2 = 330 cal, 31 * 2 = 62 protein, 0 carbs, 3.6 * 2 = 7.2 fat
        // Rice: 112 * 1.5 = 168 cal, 2.6 * 1.5 = 3.9 protein, 24 * 1.5 = 36 carbs, 0.8 * 1.5 = 1.2 fat
        // Broccoli: 34 * 1 = 34 cal, 2.8 protein, 7 carbs, 0.4 fat
        // Total: 532 cal, 68.7 protein, 43 carbs, 8.8 fat
        // Per serving (2): 266 cal, 34.35 protein, 21.5 carbs, 4.4 fat

        expect(recipe.macros.calories).toBeCloseTo(266, 0);
        expect(recipe.macros.protein).toBeCloseTo(34.35, 1);
        expect(recipe.macros.carbs).toBeCloseTo(21.5, 1);
        expect(recipe.macros.fat).toBeCloseTo(4.4, 1);
      });

      it('updates an existing recipe with same id', async () => {
        await repository.save(sampleRecipe);

        const updatedRecipe = { ...sampleRecipe, name: 'Updated Stir Fry' };
        await repository.save(updatedRecipe);

        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Updated Stir Fry');
      });

      it('adds timestamps when saving', async () => {
        await repository.save(sampleRecipe);

        const recipes = await repository.getAll();
        expect(recipes[0].createdAt).toBeDefined();
        expect(recipes[0].updatedAt).toBeDefined();
      });
    });

    describe('getById', () => {
      it('returns null when recipe does not exist', async () => {
        const recipe = await repository.getById('non-existent');
        expect(recipe).toBeNull();
      });

      it('returns the correct recipe by id', async () => {
        await repository.save(sampleRecipe);
        await repository.save(sampleRecipe2);

        const recipe = await repository.getById('recipe-456');
        expect(recipe).not.toBeNull();
        expect(recipe?.name).toBe('Breakfast Oatmeal');
      });
    });

    describe('getAll', () => {
      it('returns empty array when no recipes exist', async () => {
        const recipes = await repository.getAll();
        expect(recipes).toEqual([]);
      });

      it('returns all saved recipes', async () => {
        await repository.save(sampleRecipe);
        await repository.save(sampleRecipe2);

        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(2);
      });
    });

    describe('delete', () => {
      it('removes a recipe by id', async () => {
        await repository.save(sampleRecipe);
        await repository.save(sampleRecipe2);

        await repository.delete('recipe-123');

        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(1);
        expect(recipes[0].id).toBe('recipe-456');
      });
    });

    describe('search', () => {
      beforeEach(async () => {
        await repository.save(sampleRecipe);
        await repository.save(sampleRecipe2);
      });

      it('finds recipes by name match (case-insensitive)', async () => {
        const results = await repository.search('chicken');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Chicken Stir Fry');
      });

      it('finds recipes by description match', async () => {
        const results = await repository.search('healthy');
        expect(results).toHaveLength(2);
      });

      it('returns empty array when no match found', async () => {
        const results = await repository.search('pizza');
        expect(results).toHaveLength(0);
      });
    });

    describe('getByTags', () => {
      beforeEach(async () => {
        await repository.save(sampleRecipe);
        await repository.save(sampleRecipe2);
      });

      it('finds recipes with matching tags', async () => {
        const results = await repository.getByTags(['dinner']);
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Chicken Stir Fry');
      });

      it('finds recipes matching any of multiple tags', async () => {
        const results = await repository.getByTags(['breakfast', 'dinner']);
        expect(results).toHaveLength(2);
      });

      it('returns empty array when no tags match', async () => {
        const results = await repository.getByTags(['dessert']);
        expect(results).toHaveLength(0);
      });
    });

    describe('duplicate', () => {
      beforeEach(async () => {
        await repository.save(sampleRecipe);
      });

      it('creates a copy of the recipe with a new ID', async () => {
        const duplicated = await repository.duplicate('recipe-123');

        expect(duplicated).not.toBeNull();
        expect(duplicated?.id).not.toBe('recipe-123');
        expect(duplicated?.name).toBe('Chicken Stir Fry (Copy)');
        expect(duplicated?.ingredients).toHaveLength(3);
      });

      it('allows custom name for duplicated recipe', async () => {
        const duplicated = await repository.duplicate('recipe-123', 'My Special Stir Fry');

        expect(duplicated?.name).toBe('My Special Stir Fry');
      });

      it('returns null when original recipe not found', async () => {
        const duplicated = await repository.duplicate('non-existent');
        expect(duplicated).toBeNull();
      });

      it('saves the duplicated recipe', async () => {
        await repository.duplicate('recipe-123');

        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(2);
      });
    });

    describe('calculateMacros', () => {
      it('calculates per-serving macros from ingredients', () => {
        const macros = repository.calculateMacros(sampleRecipe.ingredients, 2);

        expect(macros.calories).toBeCloseTo(266, 0);
        expect(macros.protein).toBeCloseTo(34.35, 1);
        expect(macros.carbs).toBeCloseTo(21.5, 1);
        expect(macros.fat).toBeCloseTo(4.4, 1);
      });

      it('handles different serving sizes', () => {
        const macros = repository.calculateMacros(sampleRecipe.ingredients, 4);

        // Same total, but divided by 4 instead of 2
        expect(macros.calories).toBeCloseTo(133, 0);
        expect(macros.protein).toBeCloseTo(17.175, 1);
      });

      it('handles empty ingredients', () => {
        const macros = repository.calculateMacros([], 1);

        expect(macros.calories).toBe(0);
        expect(macros.protein).toBe(0);
        expect(macros.carbs).toBe(0);
        expect(macros.fat).toBe(0);
      });
    });
  });

  describe('Logged In User (with Firestore)', () => {
    let repository: RecipeRepository;

    beforeEach(() => {
      repository = new RecipeRepository(storage, contextLoggedIn, firestore);
    });

    describe('save', () => {
      it('saves to both local storage and Firestore', async () => {
        await repository.save(sampleRecipe);

        // Check local storage
        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(1);

        // Check Firestore was called
        expect(firestore.calls.setDoc).toHaveLength(1);
        expect(firestore.calls.setDoc[0].collectionPath).toBe('users/user-123/recipes');
        expect(firestore.calls.setDoc[0].docId).toBe('recipe-123');
      });

      it('sets createdBy to current user', async () => {
        await repository.save(sampleRecipe);

        const recipes = await repository.getAll();
        expect(recipes[0].createdBy).toBe('user-123');
      });
    });

    describe('getById', () => {
      it('returns from local cache first', async () => {
        await repository.save(sampleRecipe);
        firestore.clearCalls();

        const recipe = await repository.getById('recipe-123');
        expect(recipe?.name).toBe('Chicken Stir Fry');
        expect(firestore.calls.getDoc).toHaveLength(0);
      });

      it('fetches from Firestore when not in local cache', async () => {
        // Seed Firestore directly
        firestore.seedData('users/user-123/recipes', {
          'recipe-123': {
            ...sampleRecipe,
            macros: { calories: 266, protein: 34.35, carbs: 21.5, fat: 4.4 },
          },
        });

        const recipe = await repository.getById('recipe-123');
        expect(recipe?.name).toBe('Chicken Stir Fry');
        expect(firestore.calls.getDoc).toHaveLength(1);
      });
    });

    describe('delete', () => {
      it('deletes from both local storage and Firestore', async () => {
        await repository.save(sampleRecipe);
        firestore.clearCalls();

        await repository.delete('recipe-123');

        // Check local storage
        const recipes = await repository.getAll();
        expect(recipes).toHaveLength(0);

        // Check Firestore was called
        expect(firestore.calls.deleteDoc).toHaveLength(1);
        expect(firestore.calls.deleteDoc[0].docId).toBe('recipe-123');
      });
    });

    describe('duplicate', () => {
      it('sets createdBy to current user for duplicated recipe', async () => {
        // Original recipe created by different user
        const originalRecipe = { ...sampleRecipe, createdBy: 'other-user' };
        await repository.save(originalRecipe);

        const duplicated = await repository.duplicate('recipe-123');

        expect(duplicated?.createdBy).toBe('user-123');
      });
    });
  });

  describe('Date Serialization', () => {
    let repository: RecipeRepository;

    beforeEach(() => {
      repository = new RecipeRepository(storage, contextLoggedOut, null);
    });

    it('preserves dates through save and load cycle', async () => {
      const recipeWithDates: Recipe = {
        ...sampleRecipe,
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-16T14:00:00.000Z'),
        ingredients: [
          {
            ...chickenIngredient,
            addedAt: new Date('2024-01-15T10:30:00.000Z'),
          },
        ],
      };

      await repository.save(recipeWithDates);

      // Create new repository to force deserialization
      const newRepo = new RecipeRepository(storage, contextLoggedOut, null);
      const recipe = await newRepo.getById('recipe-123');

      expect(recipe?.createdAt).toBeInstanceOf(Date);
      expect(recipe?.ingredients[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('User State Transitions', () => {
    it('preserves local data when user logs in', async () => {
      // Save recipe while logged out
      const loggedOutRepo = new RecipeRepository(storage, contextLoggedOut, null);
      await loggedOutRepo.save(sampleRecipe);

      // Create new repository with Firestore (simulating login)
      const loggedInRepo = new RecipeRepository(storage, contextLoggedIn, firestore);

      // Data should still be accessible
      const recipe = await loggedInRepo.getById('recipe-123');
      expect(recipe?.name).toBe('Chicken Stir Fry');
    });
  });
});
