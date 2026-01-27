/**
 * DailyLogRepository Tests
 * Tests CRUD operations for daily logs with both logged-in and logged-out scenarios
 */

import { DailyLogRepository } from '../repositories/DailyLogRepository';
import { MockStorageAdapter, MockFirestoreAdapter, MockRepositoryContext } from './mocks';
import type { DailyLog, Meal, MealFood, FoodItem, Recipe, RecipeIngredient, MacroTargets } from '../index';

describe('DailyLogRepository', () => {
  let storage: MockStorageAdapter;
  let firestore: MockFirestoreAdapter;
  let contextLoggedIn: MockRepositoryContext;
  let contextLoggedOut: MockRepositoryContext;

  // Sample food items
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

  // Sample meal foods
  const chickenMealFood: MealFood = {
    id: 'mealfood-chicken-1',
    foodId: 'food-chicken',
    food: chickenFood,
    quantity: 1,
    addedAt: new Date('2024-01-15T12:00:00.000Z'),
  };

  const riceMealFood: MealFood = {
    id: 'mealfood-rice-1',
    foodId: 'food-rice',
    food: riceFood,
    quantity: 1.5,
    addedAt: new Date('2024-01-15T12:05:00.000Z'),
  };

  // Sample meals
  const sampleMeal: Meal = {
    id: 'meal-123',
    name: 'Lunch',
    foods: [chickenMealFood, riceMealFood],
    timestamp: new Date('2024-01-15T12:00:00.000Z'),
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };

  // Sample recipe
  const sampleRecipe: Recipe = {
    id: 'recipe-123',
    name: 'Chicken Rice Bowl',
    ingredients: [
      { foodId: 'food-chicken', food: chickenFood, quantity: 2 },
      { foodId: 'food-rice', food: riceFood, quantity: 1 },
    ] as RecipeIngredient[],
    servings: 2,
    macros: { calories: 221, protein: 32.3, carbs: 12, fat: 4 }, // Per serving
  };

  // Custom target macros
  const customTargets: MacroTargets = {
    calories: 2500,
    protein: 180,
    carbs: 250,
    fat: 80,
  };

  const testDate = '2024-01-15';

  beforeEach(() => {
    storage = new MockStorageAdapter();
    firestore = new MockFirestoreAdapter();
    contextLoggedIn = new MockRepositoryContext('user-123');
    contextLoggedOut = new MockRepositoryContext(null);
    contextLoggedIn.resetIdCounter();
    contextLoggedOut.resetIdCounter();
  });

  describe('Logged Out User (Local Storage Only)', () => {
    let repository: DailyLogRepository;

    beforeEach(() => {
      repository = new DailyLogRepository(storage, contextLoggedOut, null);
    });

    describe('getByDate', () => {
      it('returns empty log with default targets for non-existent date', async () => {
        const log = await repository.getByDate(testDate);

        expect(log).not.toBeNull();
        expect(log?.date).toBe(testDate);
        expect(log?.meals).toEqual([]);
        expect(log?.totalMacros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        expect(log?.targetMacros).toBeDefined();
      });

      it('returns existing log for date', async () => {
        const log: DailyLog = {
          date: testDate,
          meals: [sampleMeal],
          totalMacros: { calories: 333, protein: 34.9, carbs: 36, fat: 4.8 },
          targetMacros: customTargets,
        };
        await repository.save(log);

        const retrieved = await repository.getByDate(testDate);
        expect(retrieved?.meals).toHaveLength(1);
        expect(retrieved?.meals[0].name).toBe('Lunch');
      });
    });

    describe('save', () => {
      it('saves a daily log to local storage', async () => {
        const log: DailyLog = {
          date: testDate,
          meals: [sampleMeal],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: customTargets,
        };

        await repository.save(log);

        const retrieved = await repository.getByDate(testDate);
        expect(retrieved?.meals).toHaveLength(1);
      });

      it('recalculates total macros when saving', async () => {
        const log: DailyLog = {
          date: testDate,
          meals: [sampleMeal],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: customTargets,
        };

        await repository.save(log);

        const retrieved = await repository.getByDate(testDate);
        // Expected: chicken (165, 31, 0, 3.6) + rice*1.5 (168, 3.9, 36, 1.2) = (333, 34.9, 36, 4.8)
        expect(retrieved?.totalMacros.calories).toBeCloseTo(333, 0);
        expect(retrieved?.totalMacros.protein).toBeCloseTo(34.9, 1);
        expect(retrieved?.totalMacros.carbs).toBeCloseTo(36, 0);
        expect(retrieved?.totalMacros.fat).toBeCloseTo(4.8, 1);
      });

      it('adds updatedAt timestamp', async () => {
        const log: DailyLog = {
          date: testDate,
          meals: [],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: customTargets,
        };

        await repository.save(log);

        const retrieved = await repository.getByDate(testDate);
        expect(retrieved?.updatedAt).toBeDefined();
      });
    });

    describe('addMeal', () => {
      it('adds a meal to a date log', async () => {
        await repository.addMeal(testDate, sampleMeal);

        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(1);
        expect(log?.meals[0].name).toBe('Lunch');
      });

      it('adds multiple meals to the same date', async () => {
        const breakfastMeal: Meal = {
          id: 'meal-breakfast',
          name: 'Breakfast',
          foods: [chickenMealFood],
          timestamp: new Date('2024-01-15T08:00:00.000Z'),
          macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };

        await repository.addMeal(testDate, breakfastMeal);
        await repository.addMeal(testDate, sampleMeal);

        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(2);
      });

      it('recalculates total macros after adding meal', async () => {
        await repository.addMeal(testDate, sampleMeal);

        const log = await repository.getByDate(testDate);
        expect(log?.totalMacros.calories).toBeCloseTo(333, 0);
      });

      it('calculates meal macros if not set', async () => {
        const mealWithoutMacros: Meal = {
          ...sampleMeal,
          macros: undefined as unknown as MacroTargets,
        };

        await repository.addMeal(testDate, mealWithoutMacros);

        const log = await repository.getByDate(testDate);
        expect(log?.meals[0].macros).toBeDefined();
        expect(log?.meals[0].macros.calories).toBeGreaterThan(0);
      });
    });

    describe('addRecipeAsMeal', () => {
      it('adds a recipe as a meal with correct macros', async () => {
        await repository.addRecipeAsMeal(testDate, sampleRecipe, 1, 'Dinner');

        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(1);
        expect(log?.meals[0].name).toBe('Dinner');
        expect(log?.meals[0].recipeId).toBe('recipe-123');
        expect(log?.meals[0].recipeServings).toBe(1);
      });

      it('scales macros by serving count', async () => {
        await repository.addRecipeAsMeal(testDate, sampleRecipe, 2, 'Big Dinner');

        const log = await repository.getByDate(testDate);
        // Recipe macros per serving: 221 cal
        // 2 servings: 442 cal
        expect(log?.meals[0].macros.calories).toBeCloseTo(442, 0);
      });

      it('converts recipe ingredients to meal foods', async () => {
        await repository.addRecipeAsMeal(testDate, sampleRecipe, 1, 'Dinner');

        const log = await repository.getByDate(testDate);
        expect(log?.meals[0].foods).toHaveLength(2);
        expect(log?.meals[0].foods[0].food.name).toBe('Chicken Breast');
      });

      it('scales ingredient quantities by serving count', async () => {
        await repository.addRecipeAsMeal(testDate, sampleRecipe, 1.5, 'Dinner');

        const log = await repository.getByDate(testDate);
        // Original recipe has chicken quantity 2 for 2 servings
        // 1.5 servings = quantity 2 * 1.5 = 3
        expect(log?.meals[0].foods[0].quantity).toBeCloseTo(3, 1);
      });
    });

    describe('updateMeal', () => {
      it('updates an existing meal', async () => {
        await repository.addMeal(testDate, sampleMeal);

        const updatedMeal: Meal = {
          ...sampleMeal,
          name: 'Updated Lunch',
        };
        await repository.updateMeal(testDate, 'meal-123', updatedMeal);

        const log = await repository.getByDate(testDate);
        expect(log?.meals[0].name).toBe('Updated Lunch');
      });

      it('recalculates macros after update', async () => {
        await repository.addMeal(testDate, sampleMeal);

        const updatedMeal: Meal = {
          ...sampleMeal,
          foods: [chickenMealFood], // Remove rice
        };
        await repository.updateMeal(testDate, 'meal-123', updatedMeal);

        const log = await repository.getByDate(testDate);
        // Only chicken: 165 calories
        expect(log?.totalMacros.calories).toBeCloseTo(165, 0);
      });

      it('does nothing if meal not found', async () => {
        await repository.addMeal(testDate, sampleMeal);

        const updatedMeal: Meal = { ...sampleMeal, name: 'Updated' };
        await repository.updateMeal(testDate, 'non-existent', updatedMeal);

        const log = await repository.getByDate(testDate);
        expect(log?.meals[0].name).toBe('Lunch');
      });
    });

    describe('removeMeal', () => {
      it('removes a meal from the log', async () => {
        await repository.addMeal(testDate, sampleMeal);
        await repository.removeMeal(testDate, 'meal-123');

        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(0);
      });

      it('recalculates total macros after removal', async () => {
        const breakfastMeal: Meal = {
          id: 'meal-breakfast',
          name: 'Breakfast',
          foods: [chickenMealFood],
          timestamp: new Date(),
          macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        };

        await repository.addMeal(testDate, breakfastMeal);
        await repository.addMeal(testDate, sampleMeal);

        await repository.removeMeal(testDate, 'meal-123');

        const log = await repository.getByDate(testDate);
        expect(log?.totalMacros.calories).toBeCloseTo(165, 0);
      });
    });

    describe('delete', () => {
      it('deletes a log by date', async () => {
        await repository.addMeal(testDate, sampleMeal);
        await repository.delete(testDate);

        // Getting the date should return a fresh empty log
        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(0);
      });
    });

    describe('getAll', () => {
      it('returns all logs', async () => {
        await repository.addMeal('2024-01-15', sampleMeal);
        await repository.addMeal('2024-01-16', sampleMeal);

        const logs = await repository.getAll();
        expect(logs).toHaveLength(2);
      });
    });

    describe('getDefaultTargetMacros', () => {
      it('returns default target macros', async () => {
        const targets = await repository.getDefaultTargetMacros();

        expect(targets.calories).toBeDefined();
        expect(targets.protein).toBeDefined();
        expect(targets.carbs).toBeDefined();
        expect(targets.fat).toBeDefined();
      });
    });

    describe('setDefaultTargetMacros', () => {
      it('updates default target macros', async () => {
        repository.setDefaultTargetMacros(customTargets);

        const targets = await repository.getDefaultTargetMacros();
        expect(targets.calories).toBe(2500);
        expect(targets.protein).toBe(180);
      });

      it('uses new defaults for new logs', async () => {
        repository.setDefaultTargetMacros(customTargets);

        const log = await repository.getByDate('2024-01-20');
        expect(log?.targetMacros.calories).toBe(2500);
      });
    });
  });

  describe('Logged In User (with Firestore)', () => {
    let repository: DailyLogRepository;

    beforeEach(() => {
      repository = new DailyLogRepository(storage, contextLoggedIn, firestore);
    });

    describe('save', () => {
      it('saves to both local storage and Firestore', async () => {
        const log: DailyLog = {
          date: testDate,
          meals: [sampleMeal],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targetMacros: customTargets,
        };

        await repository.save(log);

        // Check local storage
        const retrieved = await repository.getByDate(testDate);
        expect(retrieved?.meals).toHaveLength(1);

        // Check Firestore was called
        expect(firestore.calls.setDoc).toHaveLength(1);
        expect(firestore.calls.setDoc[0].collectionPath).toBe('users/user-123/dailyLogs');
        expect(firestore.calls.setDoc[0].docId).toBe(testDate);
      });
    });

    describe('getByDate', () => {
      it('fetches from Firestore when not in local cache', async () => {
        // Seed Firestore directly
        firestore.seedData('users/user-123/dailyLogs', {
          [testDate]: {
            date: testDate,
            meals: [sampleMeal],
            totalMacros: { calories: 333, protein: 34.9, carbs: 36, fat: 4.8 },
            targetMacros: customTargets,
          },
        });

        const log = await repository.getByDate(testDate);
        expect(log?.meals).toHaveLength(1);
        expect(firestore.calls.getDoc).toHaveLength(1);
      });
    });

    describe('delete', () => {
      it('deletes from both local storage and Firestore', async () => {
        await repository.addMeal(testDate, sampleMeal);
        firestore.clearCalls();

        await repository.delete(testDate);

        expect(firestore.calls.deleteDoc).toHaveLength(1);
        expect(firestore.calls.deleteDoc[0].docId).toBe(testDate);
      });
    });

    describe('addMeal', () => {
      it('syncs to Firestore after adding meal', async () => {
        await repository.addMeal(testDate, sampleMeal);

        expect(firestore.calls.setDoc).toHaveLength(1);
      });
    });

    describe('addRecipeAsMeal', () => {
      it('syncs to Firestore after adding recipe as meal', async () => {
        await repository.addRecipeAsMeal(testDate, sampleRecipe, 1, 'Dinner');

        expect(firestore.calls.setDoc).toHaveLength(1);
      });
    });
  });

  describe('Date Serialization', () => {
    let repository: DailyLogRepository;

    beforeEach(() => {
      repository = new DailyLogRepository(storage, contextLoggedOut, null);
    });

    it('preserves dates through save and load cycle', async () => {
      await repository.addMeal(testDate, sampleMeal);

      // Create new repository to force deserialization
      const newRepo = new DailyLogRepository(storage, contextLoggedOut, null);
      const log = await newRepo.getByDate(testDate);

      expect(log?.meals[0].timestamp).toBeInstanceOf(Date);
      expect(log?.meals[0].foods[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('User State Transitions', () => {
    it('preserves local data when user logs in', async () => {
      // Save log while logged out
      const loggedOutRepo = new DailyLogRepository(storage, contextLoggedOut, null);
      await loggedOutRepo.addMeal(testDate, sampleMeal);

      // Create new repository with Firestore (simulating login)
      const loggedInRepo = new DailyLogRepository(storage, contextLoggedIn, firestore);

      // Data should still be accessible
      const log = await loggedInRepo.getByDate(testDate);
      expect(log?.meals).toHaveLength(1);
    });
  });

  describe('Custom Target Macros', () => {
    it('uses custom targets when provided to constructor', async () => {
      const repository = new DailyLogRepository(storage, contextLoggedOut, null, customTargets);

      const log = await repository.getByDate('2024-01-20');
      expect(log?.targetMacros.calories).toBe(2500);
      expect(log?.targetMacros.protein).toBe(180);
    });
  });
});
