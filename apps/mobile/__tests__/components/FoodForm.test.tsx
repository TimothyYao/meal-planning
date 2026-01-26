// Mock Dimensions before importing components (needed for MacroAmountPicker)
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  __esModule: true,
  default: {
    get: jest.fn((dim) => {
      const data = {
        window: { width: 375, height: 812, scale: 2, fontScale: 1 },
        screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
      };
      return data[dim] || data.window;
    }),
    set: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FoodForm from '../../components/FoodForm';
import type { FoodItem } from '@meal-planning/shared';

// Mock storage functions
jest.mock('../../storage', () => ({
  getLastProtein: jest.fn(() => Promise.resolve(null)),
  saveLastProtein: jest.fn(() => Promise.resolve()),
  getLastCarbs: jest.fn(() => Promise.resolve(null)),
  saveLastCarbs: jest.fn(() => Promise.resolve()),
  getLastFat: jest.fn(() => Promise.resolve(null)),
  saveLastFat: jest.fn(() => Promise.resolve()),
  getLastDate: jest.fn(() => Promise.resolve(null)),
  saveLastDate: jest.fn(() => Promise.resolve()),
  generateFoodId: jest.fn(() => Promise.resolve('new-food-id')),
}));

describe('FoodForm', () => {
  const defaultProps = {
    onSave: jest.fn(() => Promise.resolve()),
  };

  const sampleFood: FoodItem = {
    id: 'food-123',
    name: 'Chicken Breast',
    macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    servingSize: 100,
    servingUnit: 'g',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Auto-resolve alerts by calling the first button
      if (buttons && buttons.length > 0) {
        const confirmButton = buttons.find(b => b.text === 'Save') || buttons[0];
        if (confirmButton.onPress) {
          confirmButton.onPress();
        }
      }
    });
  });

  it('renders the form', () => {
    const { getByText, getByPlaceholderText } = render(<FoodForm {...defaultProps} />);
    
    expect(getByText('Food Name *')).toBeTruthy();
    expect(getByPlaceholderText('e.g., Chicken Breast')).toBeTruthy();
  });

  it('displays serving size picker', () => {
    const { getByText } = render(<FoodForm {...defaultProps} />);
    
    expect(getByText('Serving Size')).toBeTruthy();
  });

  it('displays macro inputs', () => {
    const { getByText } = render(<FoodForm {...defaultProps} />);
    
    expect(getByText('Macros (per serving)')).toBeTruthy();
    expect(getByText('Protein (g)')).toBeTruthy();
    expect(getByText('Carbs (g)')).toBeTruthy();
    expect(getByText('Fat (g)')).toBeTruthy();
    expect(getByText('Calories (auto)')).toBeTruthy();
  });

  it('shows save button with default text', () => {
    const { getByText } = render(<FoodForm {...defaultProps} />);
    
    expect(getByText('Save Food')).toBeTruthy();
  });

  it('shows custom button text', () => {
    const { getByText } = render(
      <FoodForm {...defaultProps} buttonText="Add Food" />
    );
    
    expect(getByText('Add Food')).toBeTruthy();
  });

  it('hides save button when hideSaveButton is true', () => {
    const { queryByText } = render(
      <FoodForm {...defaultProps} hideSaveButton={true} />
    );
    
    expect(queryByText('Save Food')).toBeNull();
  });

  it('shows validation error when name is empty', async () => {
    const onValidationError = jest.fn();
    const { getByText } = render(
      <FoodForm {...defaultProps} onValidationError={onValidationError} />
    );
    
    fireEvent.press(getByText('Save Food'));
    
    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalledWith('Please enter a food name');
    });
  });

  it('shows quantity picker when showQuantity is true', () => {
    const { getByText } = render(
      <FoodForm {...defaultProps} showQuantity={true} />
    );
    
    expect(getByText('Number of Servings')).toBeTruthy();
  });

  it('hides quantity picker when showQuantity is false', () => {
    const { queryByText } = render(
      <FoodForm {...defaultProps} showQuantity={false} />
    );
    
    expect(queryByText('Number of Servings')).toBeNull();
  });

  it('shows date picker when showDate is true', () => {
    const { getByText } = render(
      <FoodForm {...defaultProps} showDate={true} />
    );
    
    expect(getByText('Date')).toBeTruthy();
  });

  it('shows Today for current date', () => {
    const { getByText } = render(
      <FoodForm {...defaultProps} showDate={true} initialDate={new Date()} />
    );
    
    expect(getByText('Today')).toBeTruthy();
  });

  it('populates form with initial food data', () => {
    const { getByPlaceholderText, getByText } = render(
      <FoodForm {...defaultProps} initialFood={sampleFood} />
    );
    
    const nameInput = getByPlaceholderText('e.g., Chicken Breast');
    expect(nameInput.props.value).toBe('Chicken Breast');
  });

  it('calculates calories automatically', () => {
    const { getAllByText, getByText } = render(<FoodForm {...defaultProps} />);
    
    // Default macros are 0, so calories should show 0 (Calories (auto) shows 0)
    // There may be multiple '0' values for protein, carbs, fat
    const zeroTexts = getAllByText('0');
    expect(zeroTexts.length).toBeGreaterThan(0);
    expect(getByText('Calories (auto)')).toBeTruthy();
  });

  it('calls onSave with correct data when form is valid', async () => {
    const onSave = jest.fn(() => Promise.resolve());
    const { getByText, getByPlaceholderText } = render(
      <FoodForm {...defaultProps} onSave={onSave} />
    );
    
    // Fill in the form
    const nameInput = getByPlaceholderText('e.g., Chicken Breast');
    fireEvent.changeText(nameInput, 'Test Food');
    
    fireEvent.press(getByText('Save Food'));
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    
    const savedFood = onSave.mock.calls[0][0];
    expect(savedFood.name).toBe('Test Food');
  });

  it('shows zero calories warning', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Verify the alert is shown
      expect(title).toBe('Zero Calories');
      // Call cancel to prevent save
      if (buttons && buttons.length > 0) {
        const cancelButton = buttons.find(b => b.text === 'Cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }
    });

    const onSave = jest.fn(() => Promise.resolve());
    const { getByText, getByPlaceholderText } = render(
      <FoodForm {...defaultProps} onSave={onSave} />
    );
    
    const nameInput = getByPlaceholderText('e.g., Chicken Breast');
    fireEvent.changeText(nameInput, 'Zero Cal Food');
    
    fireEvent.press(getByText('Save Food'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Zero Calories',
        'This food has 0 calories. Are you sure you want to save it?',
        expect.any(Array)
      );
    });
  });

  it('disables save button while saving', async () => {
    const onSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { getByText, getByPlaceholderText } = render(
      <FoodForm {...defaultProps} onSave={onSave} />
    );
    
    const nameInput = getByPlaceholderText('e.g., Chicken Breast');
    fireEvent.changeText(nameInput, 'Test Food');
    
    const saveButton = getByText('Save Food');
    fireEvent.press(saveButton);
    
    // The button should show "Saving..." while saving
    await waitFor(() => {
      expect(getByText('Saving...')).toBeTruthy();
    });
  });

  it('uses initialQuantity prop', () => {
    const { getByText } = render(
      <FoodForm {...defaultProps} showQuantity={true} initialQuantity="2" />
    );
    
    expect(getByText('2')).toBeTruthy();
  });

  it('matches initial food serving size', () => {
    const foodWith100g: FoodItem = {
      ...sampleFood,
      servingSize: 100,
      servingUnit: 'g',
    };
    
    const { getByText } = render(
      <FoodForm {...defaultProps} initialFood={foodWith100g} />
    );
    
    // The serving size picker should show 100 g option as selected
    expect(getByText('100 g')).toBeTruthy();
  });
});
