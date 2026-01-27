/**
 * Firestore adapter for the shared package FirestoreAdapter interface
 * This allows the shared repositories to use Firebase Firestore
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { FirestoreAdapter, FirestoreDoc } from '@meal-planning/shared';

/**
 * Implementation of FirestoreDoc interface
 */
class FirestoreDocImpl<T> implements FirestoreDoc<T> {
  id: string;
  private _data: T | undefined;
  private _exists: boolean;

  constructor(id: string, data: T | undefined, exists: boolean) {
    this.id = id;
    this._data = data;
    this._exists = exists;
  }

  data(): T | undefined {
    return this._data;
  }

  exists(): boolean {
    return this._exists;
  }
}

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamp(value: unknown): unknown {
  if (!value) return value;

  // Handle Firestore Timestamp
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(convertTimestamp);
  }

  // Handle objects recursively
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      result[key] = convertTimestamp((value as Record<string, unknown>)[key]);
    }
    return result;
  }

  return value;
}

/**
 * Convert Date to Firestore timestamp
 */
function convertDateToTimestamp(value: unknown): unknown {
  if (!value) return value;

  // Handle Date objects
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  // Handle ISO date strings (common pattern from JSON)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(convertDateToTimestamp);
  }

  // Handle objects recursively
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key in value) {
      result[key] = convertDateToTimestamp((value as Record<string, unknown>)[key]);
    }
    return result;
  }

  return value;
}

/**
 * Mobile Firestore Adapter implementation
 */
export class MobileFirestoreAdapter implements FirestoreAdapter {
  async getDoc<T>(collectionPath: string, docId: string): Promise<FirestoreDoc<T> | null> {
    try {
      const docRef = doc(db, collectionPath, docId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = convertTimestamp(snapshot.data()) as T;
        return new FirestoreDocImpl<T>(snapshot.id, data, true);
      }

      return new FirestoreDocImpl<T>(docId, undefined, false);
    } catch (error) {
      console.error('Error getting doc from Firestore:', error);
      return null;
    }
  }

  async getDocs<T>(collectionPath: string): Promise<Array<{ id: string; data: T }>> {
    try {
      const collectionRef = collection(db, collectionPath);
      const snapshot = await getDocs(collectionRef);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        data: convertTimestamp(doc.data()) as T,
      }));
    } catch (error) {
      console.error('Error getting docs from Firestore:', error);
      return [];
    }
  }

  async setDoc<T>(collectionPath: string, docId: string, data: T): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      // Convert dates to Firestore timestamps and add updatedAt
      const dataWithTimestamps = convertDateToTimestamp({
        ...(data as object),
        updatedAt: Timestamp.now(),
      });
      await setDoc(docRef, dataWithTimestamps as Record<string, unknown>);
    } catch (error) {
      console.error('Error setting doc in Firestore:', error);
      throw error;
    }
  }

  async deleteDoc(collectionPath: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting doc from Firestore:', error);
      throw error;
    }
  }

  async queryDocs<T>(
    collectionPath: string,
    queries: Array<{ field: string; op: string; value: unknown }>
  ): Promise<Array<{ id: string; data: T }>> {
    try {
      const collectionRef = collection(db, collectionPath);
      
      // Build query with constraints
      const constraints = queries.map((q) => {
        // Map string operator to Firestore WhereFilterOp
        const op = q.op as '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
        return where(q.field, op, q.value);
      });

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        data: convertTimestamp(doc.data()) as T,
      }));
    } catch (error) {
      console.error('Error querying docs from Firestore:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const mobileFirestoreAdapter = new MobileFirestoreAdapter();
