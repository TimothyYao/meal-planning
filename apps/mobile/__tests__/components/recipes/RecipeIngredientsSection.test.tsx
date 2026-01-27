import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RecipeIngredient } from '@meal-planning/shared';
import RecipeIngredientsSection from '../../../components/recipes/RecipeIngredientsSection';

const sampleIngredient: RecipeIngredient = {
  foodId: 'food-1',
  quantity: 2,
  addedAt: new Date(),
  food: {
    id: 'food-1',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  },
};

describe('RecipeIngredientsSection', () => {
  it('shows empty state and handles add action', () => {
    const onAddIngredient = jest.fn();
    const { getByText, getByTestId } = render(
      <RecipeIngredientsSection
        ingredients={[]}
        onAddIngredient={onAddIngredient}
        onRemoveIngredient={jest.fn()}
      />
    );

    expect(getByText('No ingredients yet')).toBeTruthy();
    fireEvent.press(getByTestId('add-ingredient'));
    expect(onAddIngredient).toHaveBeenCalled();
  });

  it('renders ingredients and handles remove', () => {
    const onRemoveIngredient = jest.fn();
    const { getByText, getByTestId } = render(
      <RecipeIngredientsSection
        ingredients={[sampleIngredient]}
        onAddIngredient={jest.fn()}
        onRemoveIngredient={onRemoveIngredient}
      />
    );

    expect(getByText('Chicken Breast')).toBeTruthy();
    expect(getByText('2 x 100 g')).toBeTruthy();

    fireEvent.press(getByTestId('remove-ingredient-food-1'));
    expect(onRemoveIngredient).toHaveBeenCalledWith('food-1');
  });
});
