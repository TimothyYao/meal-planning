import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveLastProtein,
  getLastProtein,
  saveLastCarbs,
  getLastCarbs,
  saveLastFat,
  getLastFat,
  saveLastDate,
  getLastDate,
  getUserTargetMacros,
  setTodayTargetMacros,
} from '../../storage/macros';
import {
  LAST_PROTEIN_KEY,
  LAST_CARBS_KEY,
  LAST_FAT_KEY,
  LAST_DATE_KEY,
  DAILY_LOGS_KEY,
} from '../../storage/constants';

describe('Macros Storage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('saveLastProtein / getLastProtein', () => {
    it('saves and retrieves protein value', async () => {
      await saveLastProtein(25);
      const result = await getLastProtein();
      expect(result).toBe(25);
    });

    it('handles decimal values', async () => {
      await saveLastProtein(25.5);
      const result = await getLastProtein();
      expect(result).toBe(25.5);
    });

    it('returns null when no value is saved', async () => {
      const result = await getLastProtein();
      expect(result).toBeNull();
    });
  });

  describe('saveLastCarbs / getLastCarbs', () => {
    it('saves and retrieves carbs value', async () => {
      await saveLastCarbs(50);
      const result = await getLastCarbs();
      expect(result).toBe(50);
    });

    it('returns null when no value is saved', async () => {
      const result = await getLastCarbs();
      expect(result).toBeNull();
    });
  });

  describe('saveLastFat / getLastFat', () => {
    it('saves and retrieves fat value', async () => {
      await saveLastFat(15);
      const result = await getLastFat();
      expect(result).toBe(15);
    });

    it('returns null when no value is saved', async () => {
      const result = await getLastFat();
      expect(result).toBeNull();
    });
  });

  describe('saveLastDate / getLastDate', () => {
    it('saves and retrieves date', async () => {
      const testDate = new Date('2024-06-15T10:30:00.000Z');
      await saveLastDate(testDate);
      const result = await getLastDate();
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(testDate.toISOString());
    });

    it('returns null when no date is saved', async () => {
      const result = await getLastDate();
      expect(result).toBeNull();
    });

    it('returns null for invalid date string', async () => {
      await AsyncStorage.setItem(LAST_DATE_KEY, 'invalid-date');
      const result = await getLastDate();
      expect(result).toBeNull();
    });
  });

  describe('getUserTargetMacros', () => {
    it('returns default macros when no data exists', async () => {
      const result = await getUserTargetMacros();
      
      expect(result).toEqual({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
      });
    });

    it('returns macros from today log if available', async () => {
      // Mock the date to get consistent "today"
      const originalDate = Date;
      const mockDate = new Date(2024, 5, 15);
      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mockDate;
        return new (originalDate as any)(...args);
      } as any);
      
      const todayString = '2024-06-15';
      const todayLog = {
        date: todayString,
        meals: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        targetMacros: { calories: 2500, protein: 180, carbs: 250, fat: 80 },
      };
      
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify({ [todayString]: todayLog }));
      
      const result = await getUserTargetMacros();
      
      expect(result).toEqual({
        calories: 2500,
        protein: 180,
        carbs: 250,
        fat: 80,
      });
      
      jest.restoreAllMocks();
    });
  });

  describe('setTodayTargetMacros', () => {
    it('creates new log with target macros if none exists', async () => {
      const originalDate = Date;
      const mockDate = new Date(2024, 5, 15);
      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mockDate;
        return new (originalDate as any)(...args);
      } as any);
      
      const targets = { calories: 3000, protein: 200, carbs: 300, fat: 100 };
      await setTodayTargetMacros(targets);
      
      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      
      expect(logs['2024-06-15']).toBeDefined();
      expect(logs['2024-06-15'].targetMacros).toEqual(targets);
      
      jest.restoreAllMocks();
    });

    it('updates existing log with new target macros', async () => {
      const originalDate = Date;
      const mockDate = new Date(2024, 5, 15);
      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mockDate;
        return new (originalDate as any)(...args);
      } as any);
      
      const todayString = '2024-06-15';
      const existingLog = {
        date: todayString,
        meals: [{ id: 'meal-1', name: 'Breakfast', foods: [] }],
        totalMacros: { calories: 500, protein: 30, carbs: 50, fat: 20 },
        targetMacros: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
      };
      
      await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify({ [todayString]: existingLog }));
      
      const newTargets = { calories: 2500, protein: 180, carbs: 250, fat: 80 };
      await setTodayTargetMacros(newTargets);
      
      const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
      const logs = JSON.parse(logsJson!);
      
      expect(logs[todayString].meals).toHaveLength(1);
      expect(logs[todayString].targetMacros).toEqual(newTargets);
      
      jest.restoreAllMocks();
    });
  });
});
