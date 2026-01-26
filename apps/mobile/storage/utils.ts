import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID for food items
 */
export async function generateFoodId(): Promise<string> {
  return Crypto.randomUUID();
}

/**
 * Get today's date in YYYY-MM-DD format (using local time, not UTC)
 */
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
