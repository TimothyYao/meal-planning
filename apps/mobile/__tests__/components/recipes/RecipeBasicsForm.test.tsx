import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RecipeBasicsForm from '../../../components/recipes/RecipeBasicsForm';

describe('RecipeBasicsForm', () => {
  it('renders fields and forwards changes', () => {
    const onNameChange = jest.fn();
    const onDescriptionChange = jest.fn();
    const onServingsChange = jest.fn();

    const { getByPlaceholderText } = render(
      <RecipeBasicsForm
        name="Pasta"
        description="Family recipe"
        servings="4"
        onNameChange={onNameChange}
        onDescriptionChange={onDescriptionChange}
        onServingsChange={onServingsChange}
      />
    );

    fireEvent.changeText(getByPlaceholderText('e.g., Chicken Stir Fry'), 'New Name');
    fireEvent.changeText(getByPlaceholderText('Optional notes or steps'), 'Notes');
    fireEvent.changeText(getByPlaceholderText('1'), '2');

    expect(onNameChange).toHaveBeenCalledWith('New Name');
    expect(onDescriptionChange).toHaveBeenCalledWith('Notes');
    expect(onServingsChange).toHaveBeenCalledWith('2');
  });
});
