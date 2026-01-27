/**
 * Repository context for mobile app
 * Provides user info and utility functions for repositories
 */

import * as Crypto from 'expo-crypto';
import { getCurrentUser } from '../../utils/auth';
import type { RepositoryContext } from '@meal-planning/shared';

export class MobileRepositoryContext implements RepositoryContext {
  /**
   * Get current user ID, or null if not authenticated
   */
  getUserId(): string | null {
    const user = getCurrentUser();
    return user?.uid || null;
  }

  /**
   * Generate a unique ID using expo-crypto
   */
  generateId(): string {
    return Crypto.randomUUID();
  }

  /**
   * Get current date in YYYY-MM-DD format (using local time)
   */
  getCurrentDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Export a singleton instance
export const mobileRepositoryContext = new MobileRepositoryContext();
