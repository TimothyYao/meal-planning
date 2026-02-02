export interface NutritionData {
  calories: number;
  protein: number;
  totalFat: number;
  totalCarbohydrate: number;
  servingSize?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export const parseNutritionLabel = (text: string): NutritionData => {
  // 1. Normalization
  // Convert to lowercase and replace common OCR errors
  let normalizedText = text.toLowerCase();
  
  // Replace 'l' or 'i' with '1' and 'o' with '0' ONLY when surrounded by digits or next to keywords
  // This is a bit complex with regex, so we'll start with general replacements where context implies number
  
  // 2. Keyword Anchoring & Proximity Search
  // We'll look for values using regex patterns
  
  const extractValue = (patterns: RegExp[]): number => {
    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        // Group 2 usually captures the number in patterns like /(keyword)\s*(\d+)/
        // But we need to be careful with capture groups
        // Let's iterate and find the first numeric group
        for (let i = 1; i < match.length; i++) {
            const val = match[i];
            if (val && !isNaN(parseFloat(val))) {
                return parseFloat(val);
            }
        }
      }
    }
    return 0;
  };

  // Calories
  const calories = extractValue([
    /calories\s+(\d+)/,
    /energy\s+(\d+)/,
    /calories\s*:\s*(\d+)/
  ]);

  // Protein (g)
  const protein = extractValue([
    /protein\s+(\d+(?:\.\d+)?)\s*g?/,
    /protein\s*:\s*(\d+(?:\.\d+)?)/
  ]);

  // Total Fat (g)
  const totalFat = extractValue([
    /total\s+fat\s+(\d+(?:\.\d+)?)\s*g?/,
    /fat\s+(\d+(?:\.\d+)?)\s*g?/,
    /fat\s*:\s*(\d+(?:\.\d+)?)/,
    /total\s+fat\s*:\s*(\d+(?:\.\d+)?)/
  ]);

  // Total Carbohydrate (g)
  const totalCarbohydrate = extractValue([
    /total\s+carbohydrate\s+(\d+(?:\.\d+)?)\s*g?/,
    /total\s+carb\s+(\d+(?:\.\d+)?)\s*g?/,
    /carbohydrate\s+(\d+(?:\.\d+)?)\s*g?/,
    /carbs\s+(\d+(?:\.\d+)?)\s*g?/,
    /total\s+carbohydrate\s*:\s*(\d+(?:\.\d+)?)/,
    /carbohydrate\s*:\s*(\d+(?:\.\d+)?)/
  ]);

  // Serving Size (Attempt to capture)
  let servingSize: string | undefined = undefined;
  const servingMatch = normalizedText.match(/serving\s+size\s+(.+?)(\n|$)/);
  if (servingMatch && servingMatch[1]) {
    servingSize = servingMatch[1].trim();
  }

  // 3. Sanity Check & Confidence Calculation
  // 4 cal/g for protein/carbs, 9 cal/g for fat
  const calculatedCalories = (protein * 4) + (totalCarbohydrate * 4) + (totalFat * 9);
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // If we found at least calories and one macro
  if (calories > 0 && (protein > 0 || totalFat > 0 || totalCarbohydrate > 0)) {
    confidence = 'medium';
    
    // Check if calculated matches stated within 20% margin
    if (calories > 0) {
        const diff = Math.abs(calories - calculatedCalories);
        const ratio = diff / calories;
        if (ratio < 0.2) {
            confidence = 'high';
        }
    }
  } else if (calories > 0) {
      // Found calories but no macros? confusing
      confidence = 'low';
  } else if (protein > 0 && totalCarbohydrate > 0 && totalFat > 0) {
      // Found all macros but no calories? We can estimate
      confidence = 'medium'; 
  }

  return {
    calories,
    protein,
    totalFat,
    totalCarbohydrate,
    servingSize,
    confidence
  };
};
