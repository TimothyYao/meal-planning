import { parseNutritionLabel } from '../../utils/nutritionParser';

describe('nutritionParser', () => {
  it('parses a standard US label', () => {
    const text = `
      Nutrition Facts
      Serving Size 1 cup (228g)
      Calories 260
      Total Fat 13g
      Protein 5g
      Total Carbohydrate 31g
    `;
    const result = parseNutritionLabel(text);
    
    expect(result.calories).toBe(260);
    expect(result.totalFat).toBe(13);
    expect(result.protein).toBe(5);
    expect(result.totalCarbohydrate).toBe(31);
    expect(result.servingSize).toBe('1 cup (228g)');
    expect(result.confidence).toBe('high');
  });

  it('parses a label with alternative keywords', () => {
    const text = `
      Energy 100
      Fat 5.5g
      Carbs 10g
      Protein 2.5
    `;
    const result = parseNutritionLabel(text);
    
    expect(result.calories).toBe(100);
    expect(result.totalFat).toBe(5.5);
    expect(result.totalCarbohydrate).toBe(10);
    expect(result.protein).toBe(2.5);
  });

  it('handles colons in text', () => {
    const text = `
      Calories: 150
      Protein: 10g
      Total Fat: 5g
      Total Carbohydrate: 15g
    `;
    const result = parseNutritionLabel(text);
    
    expect(result.calories).toBe(150);
    expect(result.protein).toBe(10);
    expect(result.totalFat).toBe(5);
    expect(result.totalCarbohydrate).toBe(15);
  });
  
  it('detects low confidence when data is missing or inconsistent', () => {
     const text = `
      Calories 500
      Protein 1g
      Fat 1g
      Carbohydrate 1g
     `;
     const result = parseNutritionLabel(text);
     expect(result.calories).toBe(500);
     expect(result.confidence).not.toBe('high');
  });

  it('handles OCR errors gracefully', () => {
     const text = `
       Calories ???
       Fat Zero
     `;
     const result = parseNutritionLabel(text);
     expect(result.calories).toBe(0);
     expect(result.totalFat).toBe(0);
  });
});
