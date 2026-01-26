import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '@meal-planning/shared';
import { USDASearchResponse } from './usdaApi';

const USDA_CACHE_KEY = 'usda_search_cache';
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
    const cacheJson = await AsyncStorage.getItem(USDA_CACHE_KEY);
    if (cacheJson) {
      return JSON.parse(cacheJson);
    }
  } catch (error) {
    console.error('Error loading USDA cache:', error);
  }
  return { searches: [] };
}

/**
 * Save cache to storage
 */
async function saveCache(cache: CacheData): Promise<void> {
  try {
    await AsyncStorage.setItem(USDA_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving USDA cache:', error);
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
export async function getCachedSearch(query: string): Promise<FoodItem[] | null> {
  try {
    const cache = await loadCache();
    const cleanedCache = cleanExpiredEntries(cache);
    const cacheKey = getCacheKey(query);
    
    const cached = cleanedCache.searches.find(
      (search) => getCacheKey(search.query) === cacheKey
    );
    
    if (cached) {
      console.log('USDA cache hit for:', query);
      return cached.results;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached search:', error);
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheSearch(
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
    console.log('USDA search cached:', query, `(${results.length} results)`);
  } catch (error) {
    console.error('Error caching search:', error);
  }
}

/**
 * Clear all cached searches
 */
export async function clearUSDACache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USDA_CACHE_KEY);
    console.log('USDA cache cleared');
  } catch (error) {
    console.error('Error clearing USDA cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
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
    console.error('Error getting cache stats:', error);
    return { count: 0, oldestTimestamp: null, newestTimestamp: null };
  }
}
