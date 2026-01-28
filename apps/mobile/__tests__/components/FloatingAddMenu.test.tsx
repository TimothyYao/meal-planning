// Mock Dimensions before importing components
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
import FloatingAddMenu from '../../components/FloatingAddMenu';

// Mock the storage functions
jest.mock('../../storage', () => ({
  getRecentFoods: jest.fn(() => Promise.resolve([])),
  addFoodToDate: jest.fn(() => Promise.resolve()),
}));

// Mock the App refresh trigger
jest.mock('../../App', () => ({
  triggerHomeScreenRefresh: jest.fn(),
}));

describe('FloatingAddMenu', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onCustomFood: jest.fn(),
    onSearch: jest.fn(),
    onScan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('renders when visible is true', async () => {
      const { getByText } = render(<FloatingAddMenu {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Recipe')).toBeTruthy();
      });
    });

    it('returns null when visible is false', () => {
      const { queryByText } = render(
        <FloatingAddMenu {...defaultProps} visible={false} />
      );

      expect(queryByText('Recipe')).toBeNull();
    });

    it('displays all menu buttons', async () => {
      const { getByText } = render(<FloatingAddMenu {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Recipe')).toBeTruthy();
        expect(getByText('Scan')).toBeTruthy();
        expect(getByText('Custom')).toBeTruthy();
        expect(getByText('Search')).toBeTruthy();
      });
    });
  });

  describe('menu button actions', () => {
    it('calls onCustomFood when Custom button is pressed', async () => {
      const onCustomFood = jest.fn();
      const { getByText } = render(
        <FloatingAddMenu {...defaultProps} onCustomFood={onCustomFood} />
      );

      await waitFor(() => {
        expect(getByText('Custom')).toBeTruthy();
      });

      fireEvent.press(getByText('Custom'));

      expect(onCustomFood).toHaveBeenCalled();
    });

    it('calls onSearch and onClose when Search button is pressed', async () => {
      const onSearch = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <FloatingAddMenu {...defaultProps} onSearch={onSearch} onClose={onClose} />
      );

      await waitFor(() => {
        expect(getByText('Search')).toBeTruthy();
      });

      fireEvent.press(getByText('Search'));

      expect(onClose).toHaveBeenCalled();
      expect(onSearch).toHaveBeenCalled();
    });

    it('shows coming soon alert for Recipe', async () => {
      const { getByText } = render(<FloatingAddMenu {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Recipe')).toBeTruthy();
      });

      fireEvent.press(getByText('Recipe'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Coming Soon',
        'Recipe creation feature will be available soon.'
      );
    });

    it('calls onScan when Scan button is pressed', async () => {
      const onScan = jest.fn();
      const onClose = jest.fn();
      const { getByText } = render(
        <FloatingAddMenu {...defaultProps} onScan={onScan} onClose={onClose} />
      );

      await waitFor(() => {
        expect(getByText('Scan')).toBeTruthy();
      });

      fireEvent.press(getByText('Scan'));

      expect(onClose).toHaveBeenCalled();
      expect(onScan).toHaveBeenCalled();
    });
  });

  describe('recent foods', () => {
    it('shows recent foods when available', async () => {
      const { getRecentFoods } = require('../../storage');
      getRecentFoods.mockResolvedValue([
        {
          food: {
            id: 'food-123',
            name: 'Chicken Breast',
            macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            servingSize: 100,
            servingUnit: 'g',
          },
          lastAdded: new Date(),
        },
      ]);

      const { findByText } = render(<FloatingAddMenu {...defaultProps} />);

      const chickenButton = await findByText('Chicken Breast');
      expect(chickenButton).toBeTruthy();
    });

    it('handles empty recent foods gracefully', async () => {
      const { getRecentFoods } = require('../../storage');
      getRecentFoods.mockResolvedValue([]);

      const { getByText } = render(<FloatingAddMenu {...defaultProps} />);

      // Menu should still render without recent foods section
      await waitFor(() => {
        expect(getByText('Custom')).toBeTruthy();
      });
    });
  });
});
