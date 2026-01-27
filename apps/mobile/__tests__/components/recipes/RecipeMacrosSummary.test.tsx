import React from 'react';
import { render } from '@testing-library/react-native';
import { MacroTargets } from '@meal-planning/shared';
import RecipeMacrosSummary from '../../../components/recipes/RecipeMacrosSummary';

describe('RecipeMacrosSummary', () => {
  it('formats and displays macro values', () => {
    const macros: MacroTargets = {
      calories: 250.4,
      protein: 20.2,
      carbs: 30.6,
      fat: 10.1,
    };

    const { getByText } = render(<RecipeMacrosSummary macros={macros} />);

    expect(getByText('250 cal')).toBeTruthy();
    expect(getByText('20.2g')).toBeTruthy();
    expect(getByText('30.6g')).toBeTruthy();
    expect(getByText('10.1g')).toBeTruthy();
  });
});
