import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FoodItem } from '@meal-planning/shared';
import RecipeFoodPickerModal from '../../../components/recipes/RecipeFoodPickerModal';

const foods: FoodItem[] = [
  {
    id: 'food-1',
    name: 'Greek Yogurt',
    macros: { calories: 120, protein: 15, carbs: 8, fat: 2 },
    servingSize: 170,
    servingUnit: 'g',
  },
];

describe('RecipeFoodPickerModal', () => {
  it('renders foods and forwards selection', () => {
    const onSelectFood = jest.fn();
    const onSearchChange = jest.fn();

    const { getByText, getByPlaceholderText } = render(
      <RecipeFoodPickerModal
        visible={true}
        foods={foods}
        isLoading={false}
        searchQuery=""
        onSearchChange={onSearchChange}
        onSelectFood={onSelectFood}
        onClose={jest.fn()}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Search recent foods'), 'yogurt');
    expect(onSearchChange).toHaveBeenCalledWith('yogurt');

    fireEvent.press(getByText('Greek Yogurt'));
    expect(onSelectFood).toHaveBeenCalledWith(foods[0]);
  });

  it('shows empty state when no foods are available', () => {
    const { getByText } = render(
      <RecipeFoodPickerModal
        visible={true}
        foods={[]}
        isLoading={false}
        searchQuery=""
        onSearchChange={jest.fn()}
        onSelectFood={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('No recent foods')).toBeTruthy();
  });
});
