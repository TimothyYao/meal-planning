// Unmock the global firestore mock so we can test the actual implementation with mocked firebase
jest.unmock('../utils/firestore');

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyLog, FoodItem } from '@meal-planning/shared';
import { saveFoodToFirestore, getDailyLogFromFirestore, syncLocalCacheToFirestore } from '../utils/firestore';
import { getCurrentUser } from '../utils/auth';
import { auth, db } from '../config/firebase';
import * as firestore from 'firebase/firestore';

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  db: { name: 'mock-db' },
}));

jest.mock('../utils/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((database, path) => ({ database, path })),
  doc: jest.fn((database, path, id) => ({ database, path, id })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ type: 'timestamp', value: 'now' })),
    fromDate: jest.fn((date) => ({ type: 'timestamp', value: date })),
  },
  writeBatch: jest.fn(),
}));

const baseMacros = { calories: 100, protein: 10, carbs: 20, fat: 5 };

const sampleFood: FoodItem = {
  id: 'food-1',
  name: 'Apple',
  macros: baseMacros,
  servingSize: 100,
  servingUnit: 'g',
};

describe('firestore integration (mocked firebase)', () => {
  const mockGetCurrentUser = getCurrentUser as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetCurrentUser.mockReturnValue({ uid: 'user-123' });
    (auth as { currentUser: unknown }).currentUser = null;
  });

  it('saves food to Firestore and updates local cache', async () => {
    (firestore.getDocs as jest.Mock).mockResolvedValue({ docs: [] });

    const nowStamp = { type: 'timestamp', value: 'now' };
    (firestore.Timestamp.now as jest.Mock).mockReturnValue(nowStamp);

    await saveFoodToFirestore(sampleFood);

    expect(firestore.doc).toHaveBeenCalledWith(db, 'users/user-123/foods', sampleFood.id);
    const docRef = (firestore.doc as jest.Mock).mock.results[0].value;

    expect(firestore.setDoc).toHaveBeenCalledWith(
      docRef,
      expect.objectContaining({
        id: sampleFood.id,
        name: sampleFood.name,
        updatedAt: nowStamp,
      })
    );

    const cacheCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
      ([key]) => key === '@firestore_cache:foods'
    );
    expect(cacheCalls.length).toBeGreaterThan(0);
    const cachedFoods = JSON.parse(cacheCalls[cacheCalls.length - 1][1]);
    expect(cachedFoods).toEqual(expect.arrayContaining([sampleFood]));
  });

  it('hydrates daily logs from Firestore timestamps and caches result', async () => {
    const mealTimestamp = { toDate: () => new Date('2024-01-01T08:00:00Z') };
    const addedAtTimestamp = { toDate: () => new Date('2024-01-01T08:15:00Z') };

    const logData: DailyLog = {
      date: '2024-01-01',
      meals: [
        {
          id: 'meal-1',
          name: 'Breakfast',
          foods: [
            {
              foodId: sampleFood.id,
              food: sampleFood,
              quantity: 1,
              addedAt: addedAtTimestamp as unknown as Date,
            },
          ],
          timestamp: mealTimestamp as unknown as Date,
          macros: baseMacros,
        },
      ],
      totalMacros: baseMacros,
      targetMacros: baseMacros,
    };

    (firestore.getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => logData,
    });

    const result = await getDailyLogFromFirestore('2024-01-01');

    expect(result).not.toBeNull();
    expect(result?.meals[0].timestamp).toBeInstanceOf(Date);
    expect(result?.meals[0].foods[0].addedAt).toBeInstanceOf(Date);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@firestore_cache:dailyLogs', expect.any(String));
  });

  it('syncs cached foods and logs using batched writes', async () => {
    const cachedFoods: FoodItem[] = [
      sampleFood,
      {
        id: 'food-2',
        name: 'Oats',
        macros: baseMacros,
        servingSize: 40,
        servingUnit: 'g',
      },
    ];

    const cachedLogs: Record<string, DailyLog> = {
      '2024-01-01': {
        date: '2024-01-01',
        meals: [
          {
            id: 'meal-1',
            name: 'Lunch',
            foods: [
              {
                foodId: sampleFood.id,
                food: sampleFood,
                quantity: 1,
                addedAt: new Date('2024-01-01T12:00:00Z'),
              },
            ],
            timestamp: new Date('2024-01-01T11:30:00Z'),
            macros: baseMacros,
          },
        ],
        totalMacros: baseMacros,
        targetMacros: baseMacros,
      },
    };

    await AsyncStorage.setItem('@firestore_cache:foods', JSON.stringify(cachedFoods));
    await AsyncStorage.setItem('@firestore_cache:dailyLogs', JSON.stringify(cachedLogs));

    const foodsBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    const logsBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    (firestore.writeBatch as jest.Mock)
      .mockReturnValueOnce(foodsBatch)
      .mockReturnValueOnce(logsBatch);

    await syncLocalCacheToFirestore();

    expect(firestore.writeBatch).toHaveBeenCalledTimes(2);
    expect(foodsBatch.set).toHaveBeenCalledTimes(cachedFoods.length);
    expect(foodsBatch.commit).toHaveBeenCalledTimes(1);
    expect(logsBatch.set).toHaveBeenCalledTimes(Object.keys(cachedLogs).length);
    expect(logsBatch.commit).toHaveBeenCalledTimes(1);

    expect(firestore.Timestamp.fromDate).toHaveBeenCalled();
  });
});
