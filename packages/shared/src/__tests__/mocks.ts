/**
 * Mock implementations for testing repositories
 */

import type { StorageAdapter } from '../index';
import type { FirestoreAdapter, FirestoreDoc, RepositoryContext } from '../repositories/types';

/**
 * Mock Storage Adapter implementation
 * Simulates localStorage/AsyncStorage behavior
 */
export class MockStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  // Test helper methods
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    this.storage.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  setAll(data: Record<string, string>): void {
    this.storage.clear();
    Object.entries(data).forEach(([key, value]) => {
      this.storage.set(key, value);
    });
  }
}

/**
 * Mock Firestore Document
 */
class MockFirestoreDoc<T> implements FirestoreDoc<T> {
  id: string;
  private _data: T | undefined;

  constructor(id: string, data?: T) {
    this.id = id;
    this._data = data;
  }

  data(): T | undefined {
    return this._data;
  }

  exists(): boolean {
    return this._data !== undefined;
  }
}

/**
 * Mock Firestore Adapter implementation
 * Simulates Firestore behavior for testing
 */
export class MockFirestoreAdapter implements FirestoreAdapter {
  private collections: Map<string, Map<string, unknown>> = new Map();

  // Track method calls for assertions
  public calls: {
    getDoc: Array<{ collectionPath: string; docId: string }>;
    getDocs: Array<{ collectionPath: string }>;
    setDoc: Array<{ collectionPath: string; docId: string; data: unknown }>;
    deleteDoc: Array<{ collectionPath: string; docId: string }>;
    queryDocs: Array<{ collectionPath: string; queries: unknown[] }>;
  } = {
    getDoc: [],
    getDocs: [],
    setDoc: [],
    deleteDoc: [],
    queryDocs: [],
  };

  private getCollection(path: string): Map<string, unknown> {
    if (!this.collections.has(path)) {
      this.collections.set(path, new Map());
    }
    return this.collections.get(path)!;
  }

  async getDoc<T>(collectionPath: string, docId: string): Promise<FirestoreDoc<T> | null> {
    this.calls.getDoc.push({ collectionPath, docId });
    const collection = this.getCollection(collectionPath);
    const data = collection.get(docId) as T | undefined;
    return new MockFirestoreDoc<T>(docId, data);
  }

  async getDocs<T>(collectionPath: string): Promise<Array<{ id: string; data: T }>> {
    this.calls.getDocs.push({ collectionPath });
    const collection = this.getCollection(collectionPath);
    const results: Array<{ id: string; data: T }> = [];
    collection.forEach((data, id) => {
      results.push({ id, data: data as T });
    });
    return results;
  }

  async setDoc<T>(collectionPath: string, docId: string, data: T): Promise<void> {
    this.calls.setDoc.push({ collectionPath, docId, data });
    const collection = this.getCollection(collectionPath);
    collection.set(docId, data);
  }

  async deleteDoc(collectionPath: string, docId: string): Promise<void> {
    this.calls.deleteDoc.push({ collectionPath, docId });
    const collection = this.getCollection(collectionPath);
    collection.delete(docId);
  }

  async queryDocs<T>(
    collectionPath: string,
    queries: Array<{ field: string; op: string; value: unknown }>
  ): Promise<Array<{ id: string; data: T }>> {
    this.calls.queryDocs.push({ collectionPath, queries });
    // For simplicity, return all docs (can be extended for actual query logic)
    return this.getDocs<T>(collectionPath);
  }

  // Test helper methods
  clearCalls(): void {
    this.calls = {
      getDoc: [],
      getDocs: [],
      setDoc: [],
      deleteDoc: [],
      queryDocs: [],
    };
  }

  clearData(): void {
    this.collections.clear();
  }

  reset(): void {
    this.clearCalls();
    this.clearData();
  }

  // Pre-populate data for testing
  seedData(collectionPath: string, data: Record<string, unknown>): void {
    const collection = this.getCollection(collectionPath);
    Object.entries(data).forEach(([id, doc]) => {
      collection.set(id, doc);
    });
  }
}

/**
 * Mock Repository Context implementation
 */
export class MockRepositoryContext implements RepositoryContext {
  private userId: string | null;
  private idCounter = 0;

  constructor(userId: string | null = null) {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  generateId(): string {
    this.idCounter++;
    return `mock-id-${this.idCounter}`;
  }

  getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Test helpers
  resetIdCounter(): void {
    this.idCounter = 0;
  }
}
