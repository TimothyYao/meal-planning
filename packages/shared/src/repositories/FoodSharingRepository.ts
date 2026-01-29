/**
 * Food Sharing Repository Implementation
 * Manages sharing connections between users for food libraries
 */

import type { FoodItem, FoodSharingConnection, SharedFood } from '../index';
import type { IFoodSharingRepository, RepositoryContext, FirestoreAdapter } from './types';

export class FoodSharingRepository implements IFoodSharingRepository {
  private firestore: FirestoreAdapter;
  private context: RepositoryContext;

  constructor(firestore: FirestoreAdapter, context: RepositoryContext) {
    this.firestore = firestore;
    this.context = context;
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
   * Get the path to the user's sharingWith collection
   */
  private getSharingWithPath(userId?: string): string {
    const id = userId || this.requireUserId();
    return `users/${id}/sharingWith`;
  }

  /**
   * Get the path to the user's sharedWithMe collection
   */
  private getSharedWithMePath(userId?: string): string {
    const id = userId || this.requireUserId();
    return `users/${id}/sharedWithMe`;
  }

  /**
   * Get the path to a user's foods collection
   */
  private getFoodsPath(userId: string): string {
    return `users/${userId}/foods`;
  }

  /**
   * Share my foods with a user by their user ID
   */
  async shareWith(recipientId: string): Promise<void> {
    const myId = this.requireUserId();

    if (recipientId === myId) {
      throw new Error('Cannot share with yourself');
    }

    const connection: FoodSharingConnection = {
      ownerId: myId,
      recipientId: recipientId,
      createdAt: new Date(),
    };

    // Write to both collections in parallel
    await Promise.all([
      // My outgoing shares
      this.firestore.setDoc(this.getSharingWithPath(myId), recipientId, connection),
      // Their incoming shares
      this.firestore.setDoc(this.getSharedWithMePath(recipientId), myId, connection),
    ]);
  }

  /**
   * Stop sharing my foods with a user
   */
  async stopSharingWith(recipientId: string): Promise<void> {
    const myId = this.requireUserId();

    // Delete from both collections in parallel
    await Promise.all([
      this.firestore.deleteDoc(this.getSharingWithPath(myId), recipientId),
      this.firestore.deleteDoc(this.getSharedWithMePath(recipientId), myId),
    ]);
  }

  /**
   * Get list of user IDs I'm sharing my foods with
   */
  async getSharingWith(): Promise<string[]> {
    const myId = this.requireUserId();
    const docs = await this.firestore.getDocs<FoodSharingConnection>(
      this.getSharingWithPath(myId)
    );
    return docs.map((doc) => doc.id);
  }

  /**
   * Get list of user IDs sharing their foods with me
   */
  async getSharedWithMe(): Promise<string[]> {
    const myId = this.requireUserId();
    const docs = await this.firestore.getDocs<FoodSharingConnection>(
      this.getSharedWithMePath(myId)
    );
    return docs.map((doc) => doc.id);
  }

  /**
   * Leave a sharing connection (stop seeing their foods)
   */
  async leaveSharing(ownerId: string): Promise<void> {
    const myId = this.requireUserId();

    // Delete from both collections in parallel
    await Promise.all([
      // Remove from my incoming shares
      this.firestore.deleteDoc(this.getSharedWithMePath(myId), ownerId),
      // Remove from their outgoing shares
      this.firestore.deleteDoc(this.getSharingWithPath(ownerId), myId),
    ]);
  }

  /**
   * Get all foods from users sharing with me
   */
  async getSharedFoods(): Promise<SharedFood[]> {
    const ownerIds = await this.getSharedWithMe();
    const allFoods: SharedFood[] = [];

    // Fetch foods from each owner
    for (const ownerId of ownerIds) {
      const foods = await this.getFoodsFrom(ownerId);
      allFoods.push(...foods);
    }

    return allFoods;
  }

  /**
   * Get foods from a specific user sharing with me
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
   * Copy a shared food to my collection
   */
  async copyFood(ownerId: string, foodId: string): Promise<FoodItem> {
    const myId = this.requireUserId();

    // Verify we have access to this owner's foods
    const sharedWithMe = await this.getSharedWithMe();
    if (!sharedWithMe.includes(ownerId)) {
      throw new Error('You do not have access to this user\'s foods');
    }

    // Get the original food
    const foodDoc = await this.firestore.getDoc<FoodItem>(
      this.getFoodsPath(ownerId),
      foodId
    );

    if (!foodDoc || !foodDoc.exists()) {
      throw new Error('Food not found');
    }

    const originalFood = foodDoc.data()!;

    // Create a copy with new ID and metadata
    const newFood: FoodItem = {
      ...originalFood,
      id: this.context.generateId(),
      source: `shared:${ownerId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to my collection
    await this.firestore.setDoc(this.getFoodsPath(myId), newFood.id, newFood);

    return newFood;
  }

  /**
   * Check if I'm sharing with a specific user
   */
  async isSharingWith(recipientId: string): Promise<boolean> {
    const myId = this.requireUserId();
    const doc = await this.firestore.getDoc<FoodSharingConnection>(
      this.getSharingWithPath(myId),
      recipientId
    );
    return doc !== null && doc.exists();
  }

  /**
   * Check if a user is sharing with me
   */
  async isSharedWithMe(ownerId: string): Promise<boolean> {
    const myId = this.requireUserId();
    const doc = await this.firestore.getDoc<FoodSharingConnection>(
      this.getSharedWithMePath(myId),
      ownerId
    );
    return doc !== null && doc.exists();
  }
}
