import { FoodItem } from '@meal-planning/shared';

export interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal'?: number;
    'energy-kcal_100g'?: number;
    proteins?: number;
    'proteins_100g'?: number;
    carbohydrates?: number;
    'carbohydrates_100g'?: number;
    fat?: number;
    'fat_100g'?: number;
  };
  nutriscore_grade?: string;
  categories?: string;
  serving_size?: string;
  quantity?: string;
}

export interface OFFSearchResult {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriscore_grade?: string;
  categories?: string;
}

export interface OFFSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OFFSearchResult[];
}

const OFF_API_BASE_URL = 'https://world.openfoodfacts.net';
const OFF_V1_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

// Rate limiting: 10 requests/minute for search, 100 requests/minute for products
// We'll implement basic rate limiting to avoid hitting limits
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 6000; // 6 seconds between searches (10 per minute)

/**
 * Check if we can make a search request (rate limiting)
 */
function canSearch(): boolean {
  const now = Date.now();
  if (now - lastSearchTime < MIN_SEARCH_INTERVAL) {
    return false;
  }
  lastSearchTime = now;
  return true;
}

/**
 * Search Open Food Facts database using v1 API (supports full text search)
 * Note: v1 search has strict rate limits (10 req/min)
 */
export async function searchOFFProducts(
  query: string,
  pageNumber: number = 1,
  pageSize: number = 20
): Promise<OFFSearchResponse> {
  if (!query || query.trim().length === 0) {
    return { count: 0, page: 1, page_count: 0, page_size: pageSize, products: [] };
  }

  // Rate limiting check
  if (!canSearch()) {
    console.warn('Open Food Facts search rate limit: waiting...');
    // Wait a bit before retrying
    await new Promise((resolve) => setTimeout(resolve, MIN_SEARCH_INTERVAL));
  }

  try {
    // Use v1 API for full text search
    // Parameters: search_terms, page, page_size, json=1
    const params = new URLSearchParams({
      search_terms: query.trim(),
      page: pageNumber.toString(),
      page_size: pageSize.toString(),
      json: '1',
      action: 'process',
    });

    const url = `${OFF_V1_SEARCH_URL}?${params.toString()}`;
    console.log('Searching Open Food Facts:', query);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MealPlanningApp/1.0 (contact: your-email@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // v1 API returns products array directly
    if (data.products && Array.isArray(data.products)) {
      return {
        count: data.count || data.products.length,
        page: data.page || pageNumber,
        page_count: data.page_count || Math.ceil((data.count || data.products.length) / pageSize),
        page_size: data.page_size || pageSize,
        products: data.products,
      };
    }

    return { count: 0, page: 1, page_count: 0, page_size: pageSize, products: [] };
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
    throw error;
  }
}

/**
 * Get detailed product information from Open Food Facts by barcode or code
 * Uses v2 API which has better rate limits (100 req/min)
 */
export async function getOFFProductDetails(code: string): Promise<OFFProduct | null> {
  if (!code || code.trim().length === 0) {
    return null;
  }

  try {
    // Use v2 API for product details
    // Request specific fields we need
    const fields = [
      'code',
      'product_name',
      'product_name_en',
      'brands',
      'nutriments',
      'nutriscore_grade',
      'categories',
      'serving_size',
      'quantity',
    ].join(',');

    const url = `${OFF_API_BASE_URL}/api/v2/product/${code.trim()}?fields=${fields}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MealPlanningApp/1.0 (contact: your-email@example.com)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Open Food Facts API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return null;
    }

    return data.product;
  } catch (error) {
    console.error('Error fetching Open Food Facts product details:', error);
    return null;
  }
}

/**
 * Convert Open Food Facts product to FoodItem
 * Uses 100g as the default serving size (standard for nutrition labels)
 */
export async function convertOFFToFoodItem(offProduct: OFFSearchResult | OFFProduct): Promise<FoodItem | null> {
  let product: OFFProduct;

  // If search result doesn't have full nutrition data, fetch detailed product info
  if (!('nutriments' in offProduct) || !offProduct.nutriments) {
    const detailedProduct = await getOFFProductDetails(offProduct.code);
    if (!detailedProduct || !detailedProduct.nutriments) {
      return null;
    }
    product = detailedProduct;
  } else {
    product = offProduct as OFFProduct;
  }

  const nutriments = product.nutriments!;

  // Extract nutrition values (prefer per 100g values, fallback to absolute values)
  const getNutrientValue = (key: string, per100gKey: string): number => {
    const per100g = nutriments[per100gKey as keyof typeof nutriments];
    const absolute = nutriments[key as keyof typeof nutriments];
    
    if (typeof per100g === 'number') {
      return per100g;
    }
    if (typeof absolute === 'number') {
      return absolute;
    }
    return 0;
  };

  // Energy in kcal
  const calories = getNutrientValue('energy-kcal', 'energy-kcal_100g');
  
  // Macronutrients in grams
  const protein = getNutrientValue('proteins', 'proteins_100g');
  const carbs = getNutrientValue('carbohydrates', 'carbohydrates_100g');
  const fat = getNutrientValue('fat', 'fat_100g');

  // Skip products with no nutrition data
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return null;
  }

  // Get product name (prefer English, fallback to any available)
  const name = product.product_name_en || product.product_name || 'Unknown Product';

  // Generate unique ID from barcode/code
  const id = `off_${product.code}`;

  return {
    id,
    name,
    brand: product.brands?.split(',')[0]?.trim(), // Take first brand if multiple
    barcode: product.code,
    macros: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10, // Round to 1 decimal
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    },
    servingSize: 100,
    servingUnit: 'g',
  };
}

/**
 * Search and convert multiple products
 */
export async function searchAndConvertOFFProducts(
  query: string,
  pageNumber: number = 1,
  pageSize: number = 20
): Promise<FoodItem[]> {
  try {
    const response = await searchOFFProducts(query, pageNumber, pageSize);
    
    // Convert products asynchronously
    const conversionPromises = response.products.map(convertOFFToFoodItem);
    const convertedFoods = await Promise.all(conversionPromises);
    
    // Filter out null results (products without nutrition data)
    return convertedFoods.filter((food): food is FoodItem => food !== null);
  } catch (error) {
    console.error('Error searching and converting Open Food Facts products:', error);
    return [];
  }
}
