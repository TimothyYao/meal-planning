import { getTodayDate, generateFoodId } from '../../storage/utils';
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
      // Should match format YYYY-MM-DD
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns correct date values', () => {
      // Mock a specific date
      const mockDate = new Date(2024, 5, 15); // June 15, 2024
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      
      const result = getTodayDate();
      expect(result).toBe('2024-06-15');
      
      jest.restoreAllMocks();
    });

    it('pads single digit months and days', () => {
      const mockDate = new Date(2024, 0, 5); // January 5, 2024
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      
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
});
