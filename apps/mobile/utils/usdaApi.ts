import { FoodItem } from '@meal-planning/shared';

export interface USDASearchResult {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    nutrientName?: string;
    value?: number;
    amount?: number;
    unitName?: string;
  }>;
}

export interface USDASearchResponse {
  foods: USDASearchResult[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

const USDA_API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY || '';

/**
 * Check if USDA API is configured
 */
export function isUSDAAvailable(): boolean {
  return !!USDA_API_KEY && USDA_API_KEY.trim().length > 0;
}

/**
 * Search USDA FoodData Central database
 * Requests specific nutrients to ensure we get the data we need
 */
export async function searchUSDAFoods(
  query: string,
  pageNumber: number = 1,
  pageSize: number = 50
): Promise<USDASearchResponse> {
  if (!isUSDAAvailable()) {
    throw new Error('USDA API key not configured. Please set EXPO_PUBLIC_USDA_API_KEY in your .env file.');
  }

  if (!query || query.trim().length === 0) {
    return { foods: [], totalHits: 0, currentPage: 1, totalPages: 0 };
  }

  try {
    // Use POST request with JSON body for better control
    const url = `${USDA_API_BASE_URL}/foods/search?api_key=${USDA_API_KEY}`;
    
    const requestBody = {
      query: query,
      pageNumber: pageNumber,
      pageSize: pageSize,
      dataType: ['Foundation', 'SR Legacy'],
      // Request specific nutrients we need
      nutrients: [1008, 1003, 1005, 1004], // Energy, Protein, Carbs, Fat
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('USDA API error response:', errorText);
      if (response.status === 403) {
        throw new Error('USDA API key is invalid or rate limit exceeded');
      }
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log response structure for debugging (first food only)
    if (data.foods && data.foods.length > 0) {
      const firstFood = data.foods[0];
      console.log('USDA API first food sample:', {
        fdcId: firstFood.fdcId,
        description: firstFood.description,
        hasNutrients: !!firstFood.foodNutrients,
        nutrientCount: firstFood.foodNutrients?.length || 0,
        sampleNutrient: firstFood.foodNutrients?.[0],
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error searching USDA foods:', error);
    throw error;
  }
}

/**
 * Get detailed food information from USDA by FDC ID
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<USDASearchResult | null> {
  if (!isUSDAAvailable()) {
    throw new Error('USDA API key not configured');
  }

  try {
    const url = `${USDA_API_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching USDA food details:', error);
    return null;
  }
}

/**
 * Convert USDA food result to FoodItem
 * Uses 100g as the default serving size
 * If search result doesn't have nutrients, fetches detailed food info
 */
export async function convertUSDAToFoodItem(usdaFood: USDASearchResult): Promise<FoodItem | null> {
  let nutrients = usdaFood.foodNutrients;
  
  // If search result doesn't have nutrients, fetch detailed food info
  if (!nutrients || nutrients.length === 0) {
    const detailedFood = await getUSDAFoodDetails(usdaFood.fdcId);
    if (!detailedFood || !detailedFood.foodNutrients) {
      return null;
    }
    nutrients = detailedFood.foodNutrients;
  }

  // Find nutrients by their IDs
  // Energy (kcal): 1008
  // Protein: 1003
  // Carbohydrate, by difference: 1005
  // Total lipid (fat): 1004
  const energy = nutrients.find(n => n.nutrientId === 1008);
  const protein = nutrients.find(n => n.nutrientId === 1003);
  const carbs = nutrients.find(n => n.nutrientId === 1005);
  const fat = nutrients.find(n => n.nutrientId === 1004);

  // Use 'value' or 'amount' field (API might use either)
  const getNutrientValue = (nutrient: typeof nutrients[0] | undefined): number => {
    if (!nutrient) return 0;
    return nutrient.value ?? nutrient.amount ?? 0;
  };

  // Generate a unique ID from FDC ID
  const id = `usda_${usdaFood.fdcId}`;

  return {
    id,
    name: usdaFood.description,
    brand: usdaFood.brandOwner,
    macros: {
      calories: getNutrientValue(energy),
      protein: getNutrientValue(protein),
      carbs: getNutrientValue(carbs),
      fat: getNutrientValue(fat),
    },
    servingSize: 100,
    servingUnit: 'g',
  };
}
