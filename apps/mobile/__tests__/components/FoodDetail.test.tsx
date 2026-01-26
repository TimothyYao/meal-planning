import React from 'react';
import { render } from '@testing-library/react-native';
import FoodDetail from '../../components/FoodDetail';
import type { FoodItem } from '@meal-planning/shared';

describe('FoodDetail', () => {
  // Sample data - realistic food item
  const sampleFood: FoodItem = {
    id: 'food-123',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const defaultProps = {
    food: sampleFood,
    quantity: 1,
  };

  describe('rendering', () => {
    it('renders food name', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('Chicken Breast')).toBeTruthy();
    });

    it('displays serving information section', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('Serving Information')).toBeTruthy();
      expect(getByText('Serving Size')).toBeTruthy();
      expect(getByText('100 g')).toBeTruthy();
    });

    it('shows number of servings', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('Number of Servings')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
    });

    it('displays macros per serving section', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('Macros (per serving)')).toBeTruthy();
      expect(getByText('Calories')).toBeTruthy();
      expect(getByText('Protein')).toBeTruthy();
      expect(getByText('Carbs')).toBeTruthy();
      expect(getByText('Fat')).toBeTruthy();
    });
  });

  describe('macro calculations', () => {
    it('calculates calories from macros correctly', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      // Calories = protein * 4 + carbs * 4 + fat * 9
      // For chicken: 31*4 + 0*4 + 3.6*9 = 124 + 0 + 32.4 = 156.4 ≈ 156 cal
      expect(getByText('156 cal')).toBeTruthy();
    });

    it('displays macro values with grams', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('31g')).toBeTruthy(); // protein
      expect(getByText('0g')).toBeTruthy(); // carbs
      expect(getByText('3.6g')).toBeTruthy(); // fat
    });

    it('calculates total macros correctly for multiple servings', () => {
      const { getAllByText } = render(
        <FoodDetail {...defaultProps} quantity={2} />
      );

      // Total protein = 31 * 2 = 62g
      const proteinValues = getAllByText('62g');
      expect(proteinValues.length).toBeGreaterThan(0);
    });
  });

  describe('quantity display', () => {
    it('shows quantity badge when quantity > 1', () => {
      const { getByText } = render(
        <FoodDetail {...defaultProps} quantity={2} />
      );

      expect(getByText('2 servings')).toBeTruthy();
    });

    it('does not show quantity badge when quantity is 1', () => {
      const { queryByText } = render(<FoodDetail {...defaultProps} />);

      expect(queryByText('1 servings')).toBeNull();
    });

    it('shows total macros section when quantity > 1', () => {
      const { getByText } = render(
        <FoodDetail {...defaultProps} quantity={2} />
      );

      expect(getByText(/Total Macros/)).toBeTruthy();
    });

    it('does not show total macros section when quantity is 1', () => {
      const { queryByText } = render(<FoodDetail {...defaultProps} />);

      expect(queryByText(/Total Macros/)).toBeNull();
    });

    it('shows total amount when quantity > 1', () => {
      const { getByText } = render(
        <FoodDetail {...defaultProps} quantity={2} />
      );

      expect(getByText('Total Amount')).toBeTruthy();
      expect(getByText('200 g')).toBeTruthy(); // 100g * 2
    });
  });

  describe('timestamp display', () => {
    it('formats added time when provided', () => {
      const addedAt = new Date(2024, 5, 15, 14, 30);
      const { getByText } = render(
        <FoodDetail {...defaultProps} addedAt={addedAt} />
      );

      // Time format should contain hour and minute (e.g., "2:30 PM")
      expect(getByText(/:\d{2}/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles food with decimal serving size', () => {
      const foodWithDecimal: FoodItem = {
        ...sampleFood,
        servingSize: 1.5,
        servingUnit: 'cups',
      };

      const { getByText } = render(
        <FoodDetail food={foodWithDecimal} quantity={1} />
      );

      expect(getByText('1.5 cups')).toBeTruthy();
    });

    it('handles food with no serving unit', () => {
      const foodNoUnit: FoodItem = {
        ...sampleFood,
        servingSize: 1,
        servingUnit: '',
      };

      const { getAllByText, getByText } = render(
        <FoodDetail food={foodNoUnit} quantity={1} />
      );

      const oneTexts = getAllByText('1');
      expect(oneTexts.length).toBeGreaterThan(0);
      expect(getByText('Number of Servings')).toBeTruthy();
    });

    it('handles food with zero carbs', () => {
      const { getByText } = render(<FoodDetail {...defaultProps} />);

      expect(getByText('0g')).toBeTruthy();
    });

    it('handles high quantity values', () => {
      const { getByText } = render(
        <FoodDetail {...defaultProps} quantity={10} />
      );

      expect(getByText('10 servings')).toBeTruthy();
      expect(getByText('1000 g')).toBeTruthy(); // 100g * 10
    });
  });
});
