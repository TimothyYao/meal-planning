import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NumberEditor } from '../../components/NumberEditor';

describe('NumberEditor', () => {
  const defaultProps = {
    visible: true,
    value: 10,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when visible is true', () => {
      const { getByText } = render(<NumberEditor {...defaultProps} />);

      expect(getByText(/Enter Value/)).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <NumberEditor {...defaultProps} visible={false} />
      );

      expect(queryByText(/Enter Value/)).toBeNull();
    });

    it('displays custom title', () => {
      const { getByText } = render(
        <NumberEditor {...defaultProps} title="Custom Title" />
      );

      expect(getByText(/Custom Title/)).toBeTruthy();
    });

    it('shows unit badge when unit is provided', () => {
      const { getByText } = render(
        <NumberEditor {...defaultProps} unit="g" />
      );

      expect(getByText('g')).toBeTruthy();
    });
  });

  describe('range display', () => {
    it('shows range in title when hideRange is false', () => {
      const { getByText } = render(
        <NumberEditor {...defaultProps} min={5} max={100} />
      );

      expect(getByText(/5 - 100/)).toBeTruthy();
    });

    it('hides range in title when hideRange is true', () => {
      const { queryByText } = render(
        <NumberEditor {...defaultProps} min={5} max={100} hideRange={true} />
      );

      expect(queryByText(/5 - 100/)).toBeNull();
    });
  });

  describe('input validation', () => {
    it('validates input and shows alert for invalid values', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByPlaceholderText } = render(
        <NumberEditor {...defaultProps} min={0} max={100} />
      );

      const input = getByPlaceholderText('0 - 100');
      fireEvent.changeText(input, 'abc');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Invalid Input',
          'Please enter a valid number'
        );
      });
    });

    it('clamps value to max when input exceeds max', async () => {
      const onSave = jest.fn();
      const { getByPlaceholderText } = render(
        <NumberEditor {...defaultProps} onSave={onSave} min={10} max={50} />
      );

      const input = getByPlaceholderText('10 - 50');
      fireEvent.changeText(input, '100');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(50); // Clamped to max
      });
    });

    it('clamps value to min when input is below min', async () => {
      const onSave = jest.fn();
      const { getByPlaceholderText } = render(
        <NumberEditor {...defaultProps} onSave={onSave} min={10} max={50} />
      );

      const input = getByPlaceholderText('10 - 50');
      fireEvent.changeText(input, '5');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(10); // Clamped to min
      });
    });
  });

  describe('valid input handling', () => {
    it('accepts valid numeric input', async () => {
      const onSave = jest.fn();
      const { getByPlaceholderText } = render(
        <NumberEditor {...defaultProps} onSave={onSave} min={0} max={100} />
      );

      const input = getByPlaceholderText('0 - 100');
      fireEvent.changeText(input, '42');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(42);
      });
    });

    it('handles decimal input', async () => {
      const onSave = jest.fn();
      const { getByPlaceholderText } = render(
        <NumberEditor {...defaultProps} onSave={onSave} min={0} max={100} />
      );

      const input = getByPlaceholderText('0 - 100');
      fireEvent.changeText(input, '25.5');
      fireEvent(input, 'submitEditing');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(25.5);
      });
    });
  });

  describe('visibility changes', () => {
    it('clears input when modal becomes visible', async () => {
      const { getByPlaceholderText, rerender } = render(
        <NumberEditor {...defaultProps} visible={false} />
      );

      rerender(<NumberEditor {...defaultProps} visible={true} />);

      const input = getByPlaceholderText('0 - 9999');
      expect(input.props.value).toBe('');
    });
  });
});
