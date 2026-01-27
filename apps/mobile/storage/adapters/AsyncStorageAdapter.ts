/**
 * AsyncStorage adapter for the shared package StorageAdapter interface
 * This allows the shared repositories to use React Native's AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@meal-planning/shared';

export class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}

// Export a singleton instance
export const asyncStorageAdapter = new AsyncStorageAdapter();
