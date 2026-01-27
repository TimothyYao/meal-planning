import { getTodayDate, generateFoodId, clearAllCaches } from '../../storage/utils';
import {
  DAILY_LOGS_KEY,
  FOODS_KEY,
  LAST_PROTEIN_KEY,
  LAST_CARBS_KEY,
  LAST_FAT_KEY,
  LAST_DATE_KEY,
  RECENT_FOODS_CACHE_KEY,
} from '../../storage/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
}));

describe('Storage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodayDate', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const result = getTodayDate();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns correct date values', () => {
      const mockDate = new Date(2024, 5, 15); // June 15, 2024
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockDate as unknown as Date);

      const result = getTodayDate();

      expect(result).toBe('2024-06-15');

      jest.restoreAllMocks();
    });

    it('pads single digit months and days', () => {
      const mockDate = new Date(2024, 0, 5); // January 5, 2024
      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockDate as unknown as Date);

      const result = getTodayDate();

      expect(result).toBe('2024-01-05');

      jest.restoreAllMocks();
    });
  });

  describe('generateFoodId', () => {
    it('returns a UUID string', async () => {
      const result = await generateFoodId();

      expect(result).toBe('mock-uuid-12345');
      expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('generates unique IDs on multiple calls', async () => {
      (Crypto.randomUUID as jest.Mock)
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      const id1 = await generateFoodId();
      const id2 = await generateFoodId();

      expect(id1).toBe('uuid-1');
      expect(id2).toBe('uuid-2');
    });
  });

  describe('clearAllCaches', () => {
    beforeEach(async () => {
      // Clear any existing data
      await AsyncStorage.clear();
    });

    it('removes all storage keys', async () => {
      // Set up some data in storage
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify({ date: '2024-01-01' }));
      await AsyncStorage.setItem(FOODS_KEY, JSON.stringify([{ id: '1', name: 'Apple' }]));
      await AsyncStorage.setItem(LAST_PROTEIN_KEY, '100');
      await AsyncStorage.setItem(LAST_CARBS_KEY, '200');
      await AsyncStorage.setItem(LAST_FAT_KEY, '50');
      await AsyncStorage.setItem(LAST_DATE_KEY, '2024-01-01');
      await AsyncStorage.setItem(RECENT_FOODS_CACHE_KEY, JSON.stringify([]));

      // Verify data was set
      expect(await AsyncStorage.getItem(DAILY_LOGS_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(FOODS_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(LAST_PROTEIN_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(LAST_CARBS_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(LAST_FAT_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(LAST_DATE_KEY)).not.toBeNull();
      expect(await AsyncStorage.getItem(RECENT_FOODS_CACHE_KEY)).not.toBeNull();

      // Clear all caches
      await clearAllCaches();

      // Verify all data was removed
      expect(await AsyncStorage.getItem(DAILY_LOGS_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(FOODS_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(LAST_PROTEIN_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(LAST_CARBS_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(LAST_FAT_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(LAST_DATE_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(RECENT_FOODS_CACHE_KEY)).toBeNull();
    });

    it('does not throw when storage is empty', async () => {
      // Should not throw even when nothing to clear
      await expect(clearAllCaches()).resolves.not.toThrow();
    });

    it('calls multiRemove with all cache keys', async () => {
      const multiRemoveSpy = jest.spyOn(AsyncStorage, 'multiRemove');

      await clearAllCaches();

      expect(multiRemoveSpy).toHaveBeenCalledWith([
        DAILY_LOGS_KEY,
        FOODS_KEY,
        LAST_PROTEIN_KEY,
        LAST_CARBS_KEY,
        LAST_FAT_KEY,
        LAST_DATE_KEY,
        RECENT_FOODS_CACHE_KEY,
      ]);

      multiRemoveSpy.mockRestore();
    });
  });
});
