import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFood, getFoods, getFoodById, deleteFood } from '../../storage/foods';
import { FOODS_KEY } from '../../storage/constants';
import type { FoodItem } from '@meal-planning/shared';

describe('Foods Storage', () => {
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

  describe('saveFood', () => {
    it('saves a new food item', async () => {
      await saveFood(sampleFood);
      
      const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
      const foods = JSON.parse(foodsJson!);
      
      expect(foods).toHaveLength(1);
      expect(foods[0]).toEqual(sampleFood);
    });

    it('updates an existing food item with same id', async () => {
      await saveFood(sampleFood);
      
      const updatedFood = { ...sampleFood, name: 'Grilled Chicken' };
      await saveFood(updatedFood);
      
      const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
      const foods = JSON.parse(foodsJson!);
      
      expect(foods).toHaveLength(1);
      expect(foods[0].name).toBe('Grilled Chicken');
    });

    it('can save multiple foods', async () => {
      await saveFood(sampleFood);
      await saveFood(sampleFood2);
      
      const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
      const foods = JSON.parse(foodsJson!);
      
      expect(foods).toHaveLength(2);
    });
  });

  describe('getFoods', () => {
    it('returns empty array when no foods exist', async () => {
      const foods = await getFoods();
      expect(foods).toEqual([]);
    });

    it('returns all saved foods', async () => {
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([sampleFood, sampleFood2]));
      
      const foods = await getFoods();
      
      expect(foods).toHaveLength(2);
      expect(foods[0]).toEqual(sampleFood);
      expect(foods[1]).toEqual(sampleFood2);
    });
  });

  describe('getFoodById', () => {
    it('returns null when food does not exist', async () => {
      const food = await getFoodById('non-existent');
      expect(food).toBeNull();
    });

    it('returns the correct food by id', async () => {
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([sampleFood, sampleFood2]));
      
      const food = await getFoodById('food-456');
      
      expect(food).toEqual(sampleFood2);
    });

    it('returns first food when there is only one', async () => {
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([sampleFood]));
      
      const food = await getFoodById('food-123');
      
      expect(food).toEqual(sampleFood);
    });
  });

  describe('deleteFood', () => {
    it('removes a food item by id', async () => {
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([sampleFood, sampleFood2]));
      
      await deleteFood('food-123');
      
      const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
      const foods = JSON.parse(foodsJson!);
      
      expect(foods).toHaveLength(1);
      expect(foods[0].id).toBe('food-456');
    });

    it('does nothing when food does not exist', async () => {
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([sampleFood]));
      
      await deleteFood('non-existent');
      
      const foodsJson = await AsyncStorage.getItem(FOODS_KEY);
      const foods = JSON.parse(foodsJson!);
      
      expect(foods).toHaveLength(1);
    });

    it('handles empty storage', async () => {
      await expect(deleteFood('food-123')).resolves.not.toThrow();
    });
  });
});
