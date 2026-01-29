/**
 * FoodSharingRepository Tests
 * Tests food sharing operations - owner controls access, recipients view by user ID
 */

import { FoodSharingRepository } from '../repositories/FoodSharingRepository';
import { MockFirestoreAdapter, MockRepositoryContext } from './mocks';
import type { FoodItem } from '../index';

describe('FoodSharingRepository', () => {
  let firestore: MockFirestoreAdapter;
  let contextUserA: MockRepositoryContext;
  let contextUserB: MockRepositoryContext;
  let contextLoggedOut: MockRepositoryContext;

  const userAId = 'user-a-123';
  const userBId = 'user-b-456';
  const userCId = 'user-c-789';

  const foodChicken: FoodItem = {
    id: 'food-chicken',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const foodRice: FoodItem = {
    id: 'food-rice',
    name: 'Brown Rice',
    macros: { calories: 112, protein: 2.6, carbs: 24, fat: 0.8 },
    servingSize: 100,
    servingUnit: 'g',
  };

  beforeEach(() => {
    firestore = new MockFirestoreAdapter();
    contextUserA = new MockRepositoryContext(userAId);
    contextUserB = new MockRepositoryContext(userBId);
    contextLoggedOut = new MockRepositoryContext(null);

    // Seed User A's foods
    firestore.seedData(`users/${userAId}/foods`, {
      'food-chicken': foodChicken,
      'food-rice': foodRice,
    });
  });

  describe('Authentication', () => {
    it('throws error when user is not authenticated', async () => {
      const repository = new FoodSharingRepository(firestore, contextLoggedOut);

      await expect(repository.shareWith(userBId)).rejects.toThrow(
        'User must be authenticated'
      );
      await expect(repository.getSharingWith()).rejects.toThrow(
        'User must be authenticated'
      );
    });
  });

  describe('shareWith', () => {
    let repositoryA: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
    });

    it('adds user to my sharingWith collection', async () => {
      await repositoryA.shareWith(userBId);

      expect(firestore.calls.setDoc).toHaveLength(1);
      expect(firestore.calls.setDoc[0]).toMatchObject({
        collectionPath: `users/${userAId}/sharingWith`,
        docId: userBId,
      });
    });

    it('only writes to my own collection', async () => {
      await repositoryA.shareWith(userBId);

      // Should NOT write to userB's collection
      const writesToUserB = firestore.calls.setDoc.filter(
        (call) => call.collectionPath.startsWith(`users/${userBId}`)
      );
      expect(writesToUserB).toHaveLength(0);
    });

    it('throws error when trying to share with self', async () => {
      await expect(repositoryA.shareWith(userAId)).rejects.toThrow(
        'Cannot share with yourself'
      );
    });

    it('can share with multiple users', async () => {
      await repositoryA.shareWith(userBId);
      await repositoryA.shareWith(userCId);

      const sharingWith = await repositoryA.getSharingWith();
      expect(sharingWith).toHaveLength(2);
      expect(sharingWith).toContain(userBId);
      expect(sharingWith).toContain(userCId);
    });
  });

  describe('stopSharingWith', () => {
    let repositoryA: FoodSharingRepository;

    beforeEach(async () => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      await repositoryA.shareWith(userBId);
      firestore.clearCalls();
    });

    it('removes user from my sharingWith collection', async () => {
      await repositoryA.stopSharingWith(userBId);

      expect(firestore.calls.deleteDoc).toHaveLength(1);
      expect(firestore.calls.deleteDoc[0]).toMatchObject({
        collectionPath: `users/${userAId}/sharingWith`,
        docId: userBId,
      });
    });

    it('no longer shows in getSharingWith after stopping', async () => {
      await repositoryA.stopSharingWith(userBId);

      const sharingWith = await repositoryA.getSharingWith();
      expect(sharingWith).not.toContain(userBId);
    });
  });

  describe('getSharingWith', () => {
    let repositoryA: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
    });

    it('returns empty array when not sharing with anyone', async () => {
      const sharingWith = await repositoryA.getSharingWith();
      expect(sharingWith).toEqual([]);
    });

    it('returns list of user IDs being shared with', async () => {
      await repositoryA.shareWith(userBId);
      await repositoryA.shareWith(userCId);

      const sharingWith = await repositoryA.getSharingWith();
      expect(sharingWith).toHaveLength(2);
      expect(sharingWith).toContain(userBId);
      expect(sharingWith).toContain(userCId);
    });
  });

  describe('isSharingWith', () => {
    let repositoryA: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
    });

    it('returns false when not sharing with user', async () => {
      const result = await repositoryA.isSharingWith(userBId);
      expect(result).toBe(false);
    });

    it('returns true when sharing with user', async () => {
      await repositoryA.shareWith(userBId);

      const result = await repositoryA.isSharingWith(userBId);
      expect(result).toBe(true);
    });

    it('returns false after stopping sharing', async () => {
      await repositoryA.shareWith(userBId);
      await repositoryA.stopSharingWith(userBId);

      const result = await repositoryA.isSharingWith(userBId);
      expect(result).toBe(false);
    });
  });

  describe('getFoodsFrom', () => {
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('returns foods from specified user', async () => {
      const foods = await repositoryB.getFoodsFrom(userAId);

      expect(foods).toHaveLength(2);
      expect(foods.map((f) => f.name)).toContain('Chicken Breast');
      expect(foods.map((f) => f.name)).toContain('Brown Rice');
    });

    it('includes ownerId in returned foods', async () => {
      const foods = await repositoryB.getFoodsFrom(userAId);

      foods.forEach((food) => {
        expect(food.ownerId).toBe(userAId);
      });
    });

    it('returns empty array if user has no foods', async () => {
      const foods = await repositoryB.getFoodsFrom(userCId);
      expect(foods).toEqual([]);
    });
  });

  describe('copyFood', () => {
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('creates a copy of the food in my collection', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.name).toBe('Chicken Breast');
      expect(copiedFood.macros).toEqual(foodChicken.macros);
    });

    it('assigns new ID to copied food', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.id).not.toBe('food-chicken');
      expect(copiedFood.id).toMatch(/^mock-id-/);
    });

    it('does not set source field', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.source).toBeUndefined();
    });

    it('sets new timestamps on copied food', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.createdAt).toBeInstanceOf(Date);
      expect(copiedFood.updatedAt).toBeInstanceOf(Date);
    });

    it('saves copied food to my foods collection', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      const setDocCall = firestore.calls.setDoc.find(
        (call) => call.collectionPath === `users/${userBId}/foods`
      );
      expect(setDocCall).toBeDefined();
      expect(setDocCall?.docId).toBe(copiedFood.id);
    });

    it('throws error when food does not exist', async () => {
      await expect(
        repositoryB.copyFood(userAId, 'non-existent-food')
      ).rejects.toThrow('Food not found');
    });
  });
});
