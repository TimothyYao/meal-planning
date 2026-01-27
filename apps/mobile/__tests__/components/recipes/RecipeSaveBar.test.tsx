import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RecipeSaveBar from '../../../components/recipes/RecipeSaveBar';

describe('RecipeSaveBar', () => {
  it('renders save button and handles press', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <RecipeSaveBar isSaving={false} bottomInset={0} onSave={onSave} />
    );

    fireEvent.press(getByText('Save Recipe'));
    expect(onSave).toHaveBeenCalled();
  });
});
