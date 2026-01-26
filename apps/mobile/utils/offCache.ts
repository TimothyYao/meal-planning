import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '@meal-planning/shared';

const OFF_CACHE_KEY = 'off_search_cache';
const CACHE_MAX_SIZE = 50; // Maximum number of cached searches
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedSearch {
  query: string;
  results: FoodItem[];
  timestamp: number;
  totalHits: number;
}

interface CacheData {
  searches: CachedSearch[];
}

/**
 * Get cache key for a search query (normalized)
 */
function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Load cache from storage
 */
async function loadCache(): Promise<CacheData> {
  try {
    const cacheJson = await AsyncStorage.getItem(OFF_CACHE_KEY);
    if (cacheJson) {
      return JSON.parse(cacheJson);
    }
  } catch (error) {
    console.error('Error loading Open Food Facts cache:', error);
  }
  return { searches: [] };
}

/**
 * Save cache to storage
 */
async function saveCache(cache: CacheData): Promise<void> {
  try {
    await AsyncStorage.setItem(OFF_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving Open Food Facts cache:', error);
  }
}

/**
 * Clean expired entries from cache
 */
function cleanExpiredEntries(cache: CacheData): CacheData {
  const now = Date.now();
  const validSearches = cache.searches.filter(
    (search) => now - search.timestamp < CACHE_TTL
  );
  return { searches: validSearches };
}

/**
 * Get cached search results
 */
export async function getCachedOFFSearch(query: string): Promise<FoodItem[] | null> {
  try {
    const cache = await loadCache();
    const cleanedCache = cleanExpiredEntries(cache);
    const cacheKey = getCacheKey(query);
    
    const cached = cleanedCache.searches.find(
      (search) => getCacheKey(search.query) === cacheKey
    );
    
    if (cached) {
      console.log('Open Food Facts cache hit for:', query);
      return cached.results;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached Open Food Facts search:', error);
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheOFFSearch(
  query: string,
  results: FoodItem[],
  totalHits: number
): Promise<void> {
  try {
    const cache = await loadCache();
    const cleanedCache = cleanExpiredEntries(cache);
    const cacheKey = getCacheKey(query);
    
    // Remove existing entry for this query if it exists
    const filteredSearches = cleanedCache.searches.filter(
      (search) => getCacheKey(search.query) !== cacheKey
    );
    
    // Add new entry at the beginning (most recent first)
    const newEntry: CachedSearch = {
      query,
      results,
      timestamp: Date.now(),
      totalHits,
    };
    
    filteredSearches.unshift(newEntry);
    
    // Limit cache size
    const limitedSearches = filteredSearches.slice(0, CACHE_MAX_SIZE);
    
    await saveCache({ searches: limitedSearches });
    console.log('Open Food Facts search cached:', query, `(${results.length} results)`);
  } catch (error) {
    console.error('Error caching Open Food Facts search:', error);
  }
}

/**
 * Clear all cached searches
 */
export async function clearOFFCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFF_CACHE_KEY);
    console.log('Open Food Facts cache cleared');
  } catch (error) {
    console.error('Error clearing Open Food Facts cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getOFFCacheStats(): Promise<{
  count: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}> {
  try {
    const cache = await loadCache();
    const cleanedCache = cleanExpiredEntries(cache);
    
    if (cleanedCache.searches.length === 0) {
      return { count: 0, oldestTimestamp: null, newestTimestamp: null };
    }
    
    const timestamps = cleanedCache.searches.map((s) => s.timestamp);
    return {
      count: cleanedCache.searches.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps),
    };
  } catch (error) {
    console.error('Error getting Open Food Facts cache stats:', error);
    return { count: 0, oldestTimestamp: null, newestTimestamp: null };
  }
}
