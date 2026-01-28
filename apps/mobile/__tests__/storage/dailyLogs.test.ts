import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addFoodToDate,
  addFoodToToday,
  getTodayLog,
  getLogForDate,
  removeFoodFromDate,
  removeFoodFromToday,
  updateFoodQuantityInDate,
  moveFoodToDate,
  updateFoodInLogEntry,
  getRecentFoods,
  invalidateRecentFoodsCache,
} from '../../storage/dailyLogs';
import { DAILY_LOGS_KEY, RECENT_FOODS_CACHE_KEY } from '../../storage/constants';
import type { FoodItem } from '@meal-planning/shared';

// Mock generateFoodId
jest.mock('../../storage/utils', () => ({
  generateFoodId: jest.fn(() => Promise.resolve('mock-meal-id')),
  getTodayDate: jest.fn(() => '2024-06-15'),
}));

describe('Daily Logs Storage', () => {
  // Sample data - realistic food items
  const sampleFood: FoodItem = {
    id: 'food-123',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const sampleFood2: FoodItem = {
    id: 'food-456',
    name: 'Brown Rice',
    macros: { calories: 112, protein: 2.6, carbs: 24, fat: 0.8 },
    servingSize: 100,
    servingUnit: 'g',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('addFoodToDate', () => {
    it('creates a new log entry for a date that does not exist', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);

      expect(logs['2024-06-15']).toBeDefined();
      expect(logs['2024-06-15'].meals).toHaveLength(1);
      expect(logs['2024-06-15'].meals[0].foods).toHaveLength(1);
      expect(logs['2024-06-15'].meals[0].foods[0].food.name).toBe('Chicken Breast');
    });

    it('adds food to existing log', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');
      await addFoodToDate(sampleFood2, 2, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);

      expect(logs['2024-06-15'].meals[0].foods).toHaveLength(2);
    });

    it('calculates total macros correctly', async () => {
      await addFoodToDate(sampleFood, 2, '2024-06-15'); // 2 servings

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);

      expect(logs['2024-06-15'].totalMacros.protein).toBe(62); // 31 * 2
      expect(logs['2024-06-15'].totalMacros.fat).toBe(7.2); // 3.6 * 2
    });

    it('uses default target macros for new logs', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);

      expect(logs['2024-06-15'].targetMacros).toBeDefined();
    });
  });

  describe('addFoodToToday', () => {
    it("adds food to today's date", async () => {
      await addFoodToToday(sampleFood, 1);

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);

      // getTodayDate is mocked to return '2024-06-15'
      expect(logs['2024-06-15']).toBeDefined();
      expect(logs['2024-06-15'].meals[0].foods[0].food.id).toBe('food-123');
    });
  });

  describe('getTodayLog', () => {
    it('returns empty structure when no log exists', async () => {
      const log = await getTodayLog();

      expect(log).not.toBeNull();
      expect(log?.date).toBe('2024-06-15');
      expect(log?.meals).toEqual([]);
    });

    it('returns existing log for today', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const log = await getTodayLog();

      expect(log?.meals).toHaveLength(1);
      expect(log?.meals[0].foods[0].food.name).toBe('Chicken Breast');
    });
  });

  describe('getLogForDate', () => {
    it('returns empty structure for non-existent date', async () => {
      const log = await getLogForDate('2024-01-01');

      expect(log).not.toBeNull();
      expect(log?.date).toBe('2024-01-01');
      expect(log?.meals).toEqual([]);
    });

    it('returns existing log for specific date', async () => {
      await addFoodToDate(sampleFood, 1, '2024-05-20');

      const log = await getLogForDate('2024-05-20');

      expect(log?.meals).toHaveLength(1);
      expect(log?.date).toBe('2024-05-20');
    });

    it('deserializes timestamps correctly', async () => {
      await addFoodToDate(sampleFood, 1, '2024-05-20');

      const log = await getLogForDate('2024-05-20');

      expect(log?.meals[0].timestamp).toBeInstanceOf(Date);
      expect(log?.meals[0].foods[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('removeFoodFromDate', () => {
    it('removes a food from a date log', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');
      await addFoodToDate(sampleFood2, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      await removeFoodFromDate('2024-06-15', mealId, 0);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      expect(updatedLogs['2024-06-15'].meals[0].foods).toHaveLength(1);
      expect(updatedLogs['2024-06-15'].meals[0].foods[0].food.name).toBe('Brown Rice');
    });

    it('removes entire meal when last food is removed', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      await removeFoodFromDate('2024-06-15', mealId, 0);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      expect(updatedLogs['2024-06-15'].meals).toHaveLength(0);
    });

    it('recalculates macros after removal', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');
      await addFoodToDate(sampleFood2, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      // Remove chicken breast
      await removeFoodFromDate('2024-06-15', mealId, 0);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      // Only brown rice remains
      expect(updatedLogs['2024-06-15'].totalMacros.protein).toBe(2.6);
      expect(updatedLogs['2024-06-15'].totalMacros.carbs).toBe(24);
    });
  });

  describe('removeFoodFromToday', () => {
    it("removes food from today's log", async () => {
      await addFoodToToday(sampleFood, 1);

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      await removeFoodFromToday(mealId, 0);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      expect(updatedLogs['2024-06-15'].meals).toHaveLength(0);
    });
  });

  describe('updateFoodQuantityInDate', () => {
    it('updates the quantity of a food item', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      await updateFoodQuantityInDate('2024-06-15', mealId, 0, 3);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      expect(updatedLogs['2024-06-15'].meals[0].foods[0].quantity).toBe(3);
    });

    it('recalculates macros after quantity update', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      await updateFoodQuantityInDate('2024-06-15', mealId, 0, 3);

      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);

      expect(updatedLogs['2024-06-15'].totalMacros.protein).toBe(93); // 31 * 3
    });
  });

  describe('getRecentFoods', () => {
    it('returns empty array when no foods logged', async () => {
      const recentFoods = await getRecentFoods();
      expect(recentFoods).toEqual([]);
    });

    it('returns recently added foods', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-15');
      await AsyncStorage.removeItem(RECENT_FOODS_CACHE_KEY);

      const recentFoods = await getRecentFoods();

      expect(recentFoods.length).toBeGreaterThan(0);
      expect(recentFoods[0].food.name).toBe('Chicken Breast');
    });

    it('respects the limit parameter', async () => {
      await addFoodToDate(sampleFood, 1, '2024-06-14');
      await addFoodToDate(sampleFood2, 1, '2024-06-15');
      await AsyncStorage.removeItem(RECENT_FOODS_CACHE_KEY);

      const recentFoods = await getRecentFoods(1);

      expect(recentFoods).toHaveLength(1);
    });

    it('returns foods sorted by most recently added', async () => {
      const logs: Record<string, any> = {
        '2024-06-14': {
          date: '2024-06-14',
          meals: [
            {
              id: 'meal-1',
              name: 'Meal',
              foods: [
                {
                  food: sampleFood,
                  quantity: 1,
                  addedAt: '2024-06-14T10:00:00.000Z',
                },
              ],
              timestamp: '2024-06-14T10:00:00.000Z',
              macros: sampleFood.macros,
            },
          ],
          totalMacros: sampleFood.macros,
          targetMacros: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
        },
        '2024-06-15': {
          date: '2024-06-15',
          meals: [
            {
              id: 'meal-2',
              name: 'Meal',
              foods: [
                {
                  food: sampleFood2,
                  quantity: 1,
                  addedAt: '2024-06-15T12:00:00.000Z',
                },
              ],
              timestamp: '2024-06-15T12:00:00.000Z',
              macros: sampleFood2.macros,
            },
          ],
          totalMacros: sampleFood2.macros,
          targetMacros: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
        },
      };

      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
      await AsyncStorage.removeItem(RECENT_FOODS_CACHE_KEY);

      const recentFoods = await getRecentFoods();

      // Brown Rice was added more recently
      expect(recentFoods[0].food.name).toBe('Brown Rice');
    });
  });

  describe('invalidateRecentFoodsCache', () => {
    it('completes without error', async () => {
      await AsyncStorage.setItem(
        RECENT_FOODS_CACHE_KEY,
        JSON.stringify([{ food: sampleFood, lastAdded: new Date().toISOString() }])
      );

      await expect(invalidateRecentFoodsCache()).resolves.not.toThrow();
    });
  });

  describe('moveFoodToDate', () => {
    it('moves a food from one date to another and returns new location', async () => {
      // Add food to the first date
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      // Move to a new date
      const result = await moveFoodToDate('2024-06-15', '2024-06-16', mealId, 0);

      // Should return new location info
      expect(result).not.toBeNull();
      expect(result!.newMealId).toBeDefined();
      expect(result!.newFoodIndex).toBe(0); // First food in the new meal

      // Verify food is removed from old date
      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);
      expect(updatedLogs['2024-06-15'].meals).toHaveLength(0);

      // Verify food is added to new date
      expect(updatedLogs['2024-06-16']).toBeDefined();
      expect(updatedLogs['2024-06-16'].meals).toHaveLength(1);
      expect(updatedLogs['2024-06-16'].meals[0].foods).toHaveLength(1);
      expect(updatedLogs['2024-06-16'].meals[0].foods[0].food.name).toBe('Chicken Breast');
    });

    it('returns correct index when moving to a date with existing foods', async () => {
      // Add food to first date
      await addFoodToDate(sampleFood, 1, '2024-06-15');
      // Add food to second date
      await addFoodToDate(sampleFood2, 1, '2024-06-16');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const mealId = logs['2024-06-15'].meals[0].id;

      // Move to the date that already has food
      const result = await moveFoodToDate('2024-06-15', '2024-06-16', mealId, 0);

      // Should return index 1 (added after existing food)
      expect(result).not.toBeNull();
      expect(result!.newFoodIndex).toBe(1);

      // Verify both foods exist on the target date
      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);
      expect(updatedLogs['2024-06-16'].meals[0].foods).toHaveLength(2);
      expect(updatedLogs['2024-06-16'].meals[0].foods[0].food.name).toBe('Brown Rice');
      expect(updatedLogs['2024-06-16'].meals[0].foods[1].food.name).toBe('Chicken Breast');
    });

    it('returns null when source date does not exist', async () => {
      const result = await moveFoodToDate('2024-06-15', '2024-06-16', 'non-existent-meal', 0);
      expect(result).toBeNull();
    });
  });

  describe('moveFoodToDate + updateFoodInLogEntry', () => {
    it('correctly updates food after moving to a new date', async () => {
      // Add food to first date
      await addFoodToDate(sampleFood, 1, '2024-06-15');

      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      const originalMealId = logs['2024-06-15'].meals[0].id;

      // Move to a new date
      const moveResult = await moveFoodToDate('2024-06-15', '2024-06-16', originalMealId, 0);
      expect(moveResult).not.toBeNull();

      // Update the food in its new location with a new quantity
      const updatedFood = { ...sampleFood, name: 'Updated Chicken Breast' };
      await updateFoodInLogEntry('2024-06-16', moveResult!.newMealId, moveResult!.newFoodIndex, updatedFood, 2);

      // Verify the food was updated correctly
      const updatedLogsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const updatedLogs = JSON.parse(updatedLogsJson!);
      
      expect(updatedLogs['2024-06-16'].meals[0].foods[0].food.name).toBe('Updated Chicken Breast');
      expect(updatedLogs['2024-06-16'].meals[0].foods[0].quantity).toBe(2);
      
      // Verify macros are recalculated (2 servings)
      expect(updatedLogs['2024-06-16'].totalMacros.protein).toBe(62); // 31 * 2
    });
  });
});
