import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FoodItem from '../../components/FoodItem';
import type { MealFood, FoodItem as FoodItemType } from '@meal-planning/shared';

describe('FoodItem', () => {
  // Sample data - realistic food and meal data
  const sampleFood: FoodItemType = {
    id: 'food-123',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  const sampleMealFood: MealFood = {
    foodId: 'food-123',
    food: sampleFood,
    quantity: 1,
    addedAt: new Date(2024, 5, 15, 14, 30),
  };

  const defaultProps = {
    mealFood: sampleMealFood,
    mealId: 'meal-1',
    index: 0,
    totalItems: 1,
    onPress: jest.fn(),
    onRemove: jest.fn(),
    formatServingInfo: jest.fn((qty, size, unit) => `${qty} x ${size}${unit}`),
    formatTime: jest.fn(() => '2:30 PM'),
    calculateCaloriesFromMacros: jest.fn(
      (macros) => macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders food name', () => {
      const { getByText } = render(<FoodItem {...defaultProps} />);

      expect(getByText('Chicken Breast')).toBeTruthy();
    });

    it('displays serving info using formatServingInfo', () => {
      const formatServingInfo = jest.fn(() => '1 serving (100g)');
      const { getByText } = render(
        <FoodItem {...defaultProps} formatServingInfo={formatServingInfo} />
      );

      expect(getByText('1 serving (100g)')).toBeTruthy();
      expect(formatServingInfo).toHaveBeenCalledWith(1, 100, 'g');
    });

    it('displays time when addedAt is provided', () => {
      const formatTime = jest.fn(() => '2:30 PM');
      const { getByText } = render(
        <FoodItem {...defaultProps} formatTime={formatTime} />
      );

      expect(getByText('2:30 PM')).toBeTruthy();
    });

    it('displays macro values in P/C/F format', () => {
      const { getByText } = render(<FoodItem {...defaultProps} />);

      expect(getByText(/31/)).toBeTruthy(); // protein
      expect(getByText(/P\//)).toBeTruthy();
    });

    it('displays calculated calories', () => {
      const { getByText } = render(<FoodItem {...defaultProps} />);

      // Calories = 31*4 + 0*4 + 3.6*9 = 156.4 ≈ 156
      expect(getByText(/156/)).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('calls onPress when item is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <FoodItem {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(getByText('Chicken Breast'));

      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('quantity calculations', () => {
    it('calculates macros with quantity multiplier', () => {
      const mealFoodWithQuantity: MealFood = {
        ...sampleMealFood,
        quantity: 2,
      };

      const { getByText } = render(
        <FoodItem {...defaultProps} mealFood={mealFoodWithQuantity} />
      );

      // Protein * 2 = 62
      expect(getByText(/62/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles food without addedAt timestamp', () => {
      const mealFoodNoTime: MealFood = {
        foodId: 'food-123',
        food: sampleFood,
        quantity: 1,
      };

      const { queryByText } = render(
        <FoodItem {...defaultProps} mealFood={mealFoodNoTime} />
      );

      // Should not show time
      expect(queryByText('2:30 PM')).toBeNull();
    });
  });

  describe('callback functions', () => {
    it('calls formatServingInfo with correct arguments', () => {
      const formatServingInfo = jest.fn(() => 'serving info');
      render(<FoodItem {...defaultProps} formatServingInfo={formatServingInfo} />);

      expect(formatServingInfo).toHaveBeenCalledWith(
        sampleMealFood.quantity,
        sampleFood.servingSize,
        sampleFood.servingUnit
      );
    });

    it('calls calculateCaloriesFromMacros with food macros', () => {
      const calculateCaloriesFromMacros = jest.fn(() => 200);
      render(
        <FoodItem
          {...defaultProps}
          calculateCaloriesFromMacros={calculateCaloriesFromMacros}
        />
      );

      expect(calculateCaloriesFromMacros).toHaveBeenCalledWith(sampleFood.macros);
    });

    it('calls onSwipeableRef when mounted', () => {
      const onSwipeableRef = jest.fn();
      render(<FoodItem {...defaultProps} onSwipeableRef={onSwipeableRef} />);

      expect(onSwipeableRef).toHaveBeenCalled();
    });
  });
});
