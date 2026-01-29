/**
 * Food Sharing Repository Implementation
 * Manages sharing connections - owner controls who can view their foods
 */

import type { FoodItem, SharedFood } from '../index';
import type { IFoodSharingRepository, RepositoryContext, FirestoreAdapter } from './types';

export class FoodSharingRepository implements IFoodSharingRepository {
  private firestore: FirestoreAdapter;
  private context: RepositoryContext;

  constructor(firestore: FirestoreAdapter, context: RepositoryContext) {
    this.firestore = firestore;
    this.context = context;
  }

  /**
   * Get the current user's ID.
   * Returns null if not authenticated.
   */
  getCurrentUserId(): string | null {
    return this.context.getUserId();
  }

  /**
   * Get the current user ID or throw if not authenticated
   */
  private requireUserId(): string {
    const userId = this.context.getUserId();
    if (!userId) {
      throw new Error('User must be authenticated to use food sharing');
    }
    return userId;
  }

  /**
   * Get the path to a user's sharingWith collection
   */
  private getSharingWithPath(userId: string): string {
    return `users/${userId}/sharingWith`;
  }

  /**
   * Get the path to a user's foods collection
   */
  private getFoodsPath(userId: string): string {
    return `users/${userId}/foods`;
  }

  /**
   * Share my foods with a user by their user ID.
   * Only writes to my own collection.
   */
  async shareWith(recipientId: string): Promise<void> {
    const myId = this.requireUserId();

    if (recipientId === myId) {
      throw new Error('Cannot share with yourself');
    }

    // Only write to my own sharingWith collection
    await this.firestore.setDoc(
      this.getSharingWithPath(myId),
      recipientId,
      { added: new Date() }
    );
  }

  /**
   * Stop sharing my foods with a user.
   * Only deletes from my own collection.
   */
  async stopSharingWith(recipientId: string): Promise<void> {
    const myId = this.requireUserId();
    await this.firestore.deleteDoc(this.getSharingWithPath(myId), recipientId);
  }

  /**
   * Get list of user IDs I'm sharing my foods with.
   */
  async getSharingWith(): Promise<string[]> {
    const myId = this.requireUserId();
    const docs = await this.firestore.getDocs(this.getSharingWithPath(myId));
    return docs.map((doc) => doc.id);
  }

  /**
   * Check if I'm currently sharing with a specific user.
   */
  async isSharingWith(recipientId: string): Promise<boolean> {
    const myId = this.requireUserId();
    const doc = await this.firestore.getDoc(
      this.getSharingWithPath(myId),
      recipientId
    );
    return doc !== null && doc.exists();
  }

  /**
   * Get foods from a specific user.
   * Caller should know the owner's user ID.
   */
  async getFoodsFrom(ownerId: string): Promise<SharedFood[]> {
    const docs = await this.firestore.getDocs<FoodItem>(this.getFoodsPath(ownerId));
    return docs.map((doc) => ({
      ...doc.data,
      id: doc.id,
      ownerId,
    }));
  }

  /**
   * Copy a food to my collection.
   * Simple convenience function - just duplicates the food data.
   */
  async copyFood(ownerId: string, foodId: string): Promise<FoodItem> {
    const myId = this.requireUserId();

    // Get the original food
    const foodDoc = await this.firestore.getDoc<FoodItem>(
      this.getFoodsPath(ownerId),
      foodId
    );

    if (!foodDoc || !foodDoc.exists()) {
      throw new Error('Food not found');
    }

    const originalFood = foodDoc.data()!;

    // Create a copy with new ID
    const newFood: FoodItem = {
      ...originalFood,
      id: this.context.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to my collection
    await this.firestore.setDoc(this.getFoodsPath(myId), newFood.id, newFood);

    return newFood;
  }
}
