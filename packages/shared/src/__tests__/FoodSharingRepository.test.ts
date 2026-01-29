/**
 * FoodSharingRepository Tests
 * Tests food sharing operations between users
 */

import { FoodSharingRepository } from '../repositories/FoodSharingRepository';
import { MockFirestoreAdapter, MockRepositoryContext } from './mocks';
import type { FoodItem } from '../index';

describe('FoodSharingRepository', () => {
  let firestore: MockFirestoreAdapter;
  let contextUserA: MockRepositoryContext;
  let contextUserB: MockRepositoryContext;
  let contextLoggedOut: MockRepositoryContext;

  // User IDs
  const userAId = 'user-a-123';
  const userBId = 'user-b-456';
  const userCId = 'user-c-789';

  // Sample foods owned by User A
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

  // Sample foods owned by User B
  const foodSalmon: FoodItem = {
    id: 'food-salmon',
    name: 'Grilled Salmon',
    macros: { calories: 208, protein: 20, carbs: 0, fat: 13 },
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

    // Seed User B's foods
    firestore.seedData(`users/${userBId}/foods`, {
      'food-salmon': foodSalmon,
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
      await expect(repository.getSharedWithMe()).rejects.toThrow(
        'User must be authenticated'
      );
    });
  });

  describe('shareWith', () => {
    let repositoryA: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
    });

    it('creates sharing connection in both users collections', async () => {
      await repositoryA.shareWith(userBId);

      // Check User A's outgoing shares
      expect(firestore.calls.setDoc).toHaveLength(2);
      expect(firestore.calls.setDoc[0]).toMatchObject({
        collectionPath: `users/${userAId}/sharingWith`,
        docId: userBId,
      });

      // Check User B's incoming shares
      expect(firestore.calls.setDoc[1]).toMatchObject({
        collectionPath: `users/${userBId}/sharedWithMe`,
        docId: userAId,
      });
    });

    it('stores correct connection data', async () => {
      await repositoryA.shareWith(userBId);

      const connectionData = firestore.calls.setDoc[0].data as any;
      expect(connectionData.ownerId).toBe(userAId);
      expect(connectionData.recipientId).toBe(userBId);
      expect(connectionData.createdAt).toBeInstanceOf(Date);
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
      // Set up existing share
      await repositoryA.shareWith(userBId);
      firestore.clearCalls();
    });

    it('removes sharing connection from both collections', async () => {
      await repositoryA.stopSharingWith(userBId);

      expect(firestore.calls.deleteDoc).toHaveLength(2);
      expect(firestore.calls.deleteDoc[0]).toMatchObject({
        collectionPath: `users/${userAId}/sharingWith`,
        docId: userBId,
      });
      expect(firestore.calls.deleteDoc[1]).toMatchObject({
        collectionPath: `users/${userBId}/sharedWithMe`,
        docId: userAId,
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

  describe('getSharedWithMe', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('returns empty array when no one is sharing with me', async () => {
      const sharedWithMe = await repositoryA.getSharedWithMe();
      expect(sharedWithMe).toEqual([]);
    });

    it('returns list of user IDs sharing with me', async () => {
      // User A shares with User B
      await repositoryA.shareWith(userBId);

      // User B should see User A in their sharedWithMe
      const sharedWithB = await repositoryB.getSharedWithMe();
      expect(sharedWithB).toHaveLength(1);
      expect(sharedWithB).toContain(userAId);
    });
  });

  describe('leaveSharing', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(async () => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
      // User A shares with User B
      await repositoryA.shareWith(userBId);
      firestore.clearCalls();
    });

    it('removes connection from both collections when recipient leaves', async () => {
      await repositoryB.leaveSharing(userAId);

      expect(firestore.calls.deleteDoc).toHaveLength(2);
      // User B's incoming share removed
      expect(firestore.calls.deleteDoc[0]).toMatchObject({
        collectionPath: `users/${userBId}/sharedWithMe`,
        docId: userAId,
      });
      // User A's outgoing share removed
      expect(firestore.calls.deleteDoc[1]).toMatchObject({
        collectionPath: `users/${userAId}/sharingWith`,
        docId: userBId,
      });
    });

    it('recipient no longer sees owner in sharedWithMe after leaving', async () => {
      await repositoryB.leaveSharing(userAId);

      const sharedWithB = await repositoryB.getSharedWithMe();
      expect(sharedWithB).not.toContain(userAId);
    });
  });

  describe('getSharedFoods', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('returns empty array when no one is sharing with me', async () => {
      const foods = await repositoryA.getSharedFoods();
      expect(foods).toEqual([]);
    });

    it('returns all foods from users sharing with me', async () => {
      // User A shares with User B
      await repositoryA.shareWith(userBId);

      // User B should see User A's foods
      const foods = await repositoryB.getSharedFoods();
      expect(foods).toHaveLength(2);
      expect(foods.map((f) => f.name)).toContain('Chicken Breast');
      expect(foods.map((f) => f.name)).toContain('Brown Rice');
    });

    it('includes ownerId in shared foods', async () => {
      await repositoryA.shareWith(userBId);

      const foods = await repositoryB.getSharedFoods();
      expect(foods[0].ownerId).toBe(userAId);
      expect(foods[1].ownerId).toBe(userAId);
    });

    it('returns foods from multiple sharers', async () => {
      // Create User C's repository and foods
      const contextUserC = new MockRepositoryContext(userCId);
      const repositoryC = new FoodSharingRepository(firestore, contextUserC);
      
      const foodBroccoli: FoodItem = {
        id: 'food-broccoli',
        name: 'Broccoli',
        macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
        servingSize: 100,
        servingUnit: 'g',
      };
      firestore.seedData(`users/${userCId}/foods`, {
        'food-broccoli': foodBroccoli,
      });

      // Both A and C share with B
      await repositoryA.shareWith(userBId);
      await repositoryC.shareWith(userBId);

      // User B should see foods from both
      const foods = await repositoryB.getSharedFoods();
      expect(foods).toHaveLength(3); // 2 from A + 1 from C
      expect(foods.map((f) => f.name)).toContain('Chicken Breast');
      expect(foods.map((f) => f.name)).toContain('Brown Rice');
      expect(foods.map((f) => f.name)).toContain('Broccoli');
    });
  });

  describe('getFoodsFrom', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(async () => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
      await repositoryA.shareWith(userBId);
    });

    it('returns foods from a specific user', async () => {
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
      // User C has no foods seeded
      const foods = await repositoryB.getFoodsFrom(userCId);
      expect(foods).toEqual([]);
    });
  });

  describe('copyFood', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(async () => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
      await repositoryA.shareWith(userBId);
      firestore.clearCalls();
    });

    it('creates a copy of the food in user\'s collection', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.name).toBe('Chicken Breast');
      expect(copiedFood.macros).toEqual(foodChicken.macros);
    });

    it('assigns new ID to copied food', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.id).not.toBe('food-chicken');
      expect(copiedFood.id).toMatch(/^mock-id-/);
    });

    it('sets source to indicate shared origin', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.source).toBe(`shared:${userAId}`);
    });

    it('sets new timestamps on copied food', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      expect(copiedFood.createdAt).toBeInstanceOf(Date);
      expect(copiedFood.updatedAt).toBeInstanceOf(Date);
    });

    it('saves copied food to user\'s foods collection', async () => {
      const copiedFood = await repositoryB.copyFood(userAId, 'food-chicken');

      const setDocCall = firestore.calls.setDoc.find(
        (call) => call.collectionPath === `users/${userBId}/foods`
      );
      expect(setDocCall).toBeDefined();
      expect(setDocCall?.docId).toBe(copiedFood.id);
    });

    it('throws error when user does not have access', async () => {
      // User A is not sharing with User C
      const contextUserC = new MockRepositoryContext(userCId);
      const repositoryC = new FoodSharingRepository(firestore, contextUserC);

      await expect(repositoryC.copyFood(userAId, 'food-chicken')).rejects.toThrow(
        'You do not have access'
      );
    });

    it('throws error when food does not exist', async () => {
      await expect(
        repositoryB.copyFood(userAId, 'non-existent-food')
      ).rejects.toThrow('Food not found');
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

  describe('isSharedWithMe', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('returns false when user is not sharing with me', async () => {
      const result = await repositoryB.isSharedWithMe(userAId);
      expect(result).toBe(false);
    });

    it('returns true when user is sharing with me', async () => {
      await repositoryA.shareWith(userBId);

      const result = await repositoryB.isSharedWithMe(userAId);
      expect(result).toBe(true);
    });

    it('returns false after leaving sharing', async () => {
      await repositoryA.shareWith(userBId);
      await repositoryB.leaveSharing(userAId);

      const result = await repositoryB.isSharedWithMe(userAId);
      expect(result).toBe(false);
    });
  });

  describe('Bidirectional Sharing', () => {
    let repositoryA: FoodSharingRepository;
    let repositoryB: FoodSharingRepository;

    beforeEach(() => {
      repositoryA = new FoodSharingRepository(firestore, contextUserA);
      repositoryB = new FoodSharingRepository(firestore, contextUserB);
    });

    it('supports two users sharing with each other', async () => {
      // A shares with B
      await repositoryA.shareWith(userBId);
      // B shares with A
      await repositoryB.shareWith(userAId);

      // A sees B's foods
      const foodsSeenByA = await repositoryA.getSharedFoods();
      expect(foodsSeenByA.map((f) => f.name)).toContain('Grilled Salmon');

      // B sees A's foods
      const foodsSeenByB = await repositoryB.getSharedFoods();
      expect(foodsSeenByB.map((f) => f.name)).toContain('Chicken Breast');
      expect(foodsSeenByB.map((f) => f.name)).toContain('Brown Rice');
    });

    it('stopping one direction does not affect the other', async () => {
      await repositoryA.shareWith(userBId);
      await repositoryB.shareWith(userAId);

      // A stops sharing with B
      await repositoryA.stopSharingWith(userBId);

      // B should no longer see A's foods
      const foodsSeenByB = await repositoryB.getSharedFoods();
      expect(foodsSeenByB.map((f) => f.name)).not.toContain('Chicken Breast');

      // But A should still see B's foods
      const foodsSeenByA = await repositoryA.getSharedFoods();
      expect(foodsSeenByA.map((f) => f.name)).toContain('Grilled Salmon');
    });
  });
});
