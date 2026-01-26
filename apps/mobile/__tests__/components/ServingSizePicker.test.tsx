import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ServingSizePicker, ServingOption } from '../../components/ServingSizePicker';

describe('ServingSizePicker', () => {
  const mockOptions: ServingOption[] = [
    { id: '1g', value: 1, unit: 'g', label: '1 g' },
    { id: '100g', value: 100, unit: 'g', label: '100 g' },
    { id: '1serving', value: 1, unit: 'serving', label: '1 serving' },
    { id: '1cup', value: 240, unit: 'ml', label: '1 cup (240 ml)' },
  ];

  const defaultProps = {
    options: mockOptions,
    selectedId: '100g',
    onSelect: jest.fn(),
    onExpandedChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selected option label', () => {
    const { getByText } = render(<ServingSizePicker {...defaultProps} />);
    
    expect(getByText('100 g')).toBeTruthy();
  });

  it('shows different selected option when selectedId changes', () => {
    const { getByText } = render(
      <ServingSizePicker {...defaultProps} selectedId="1cup" />
    );
    
    expect(getByText('1 cup (240 ml)')).toBeTruthy();
  });

  it('opens modal when pressed', async () => {
    const onExpandedChange = jest.fn();
    const { getByText } = render(
      <ServingSizePicker {...defaultProps} onExpandedChange={onExpandedChange} />
    );
    
    // Press the trigger button
    fireEvent.press(getByText('100 g'));
    
    // Wait for modal to open
    await waitFor(() => {
      expect(onExpandedChange).toHaveBeenCalledWith(true);
    });
  });

  it('displays all options in modal', async () => {
    const { getByText, findByText } = render(<ServingSizePicker {...defaultProps} />);
    
    // Open modal
    fireEvent.press(getByText('100 g'));
    
    // Check all options are visible
    await waitFor(() => {
      expect(getByText('1 g')).toBeTruthy();
      expect(getByText('1 serving')).toBeTruthy();
      expect(getByText('1 cup (240 ml)')).toBeTruthy();
    });
  });

  it('calls onSelect when an option is chosen', async () => {
    const onSelect = jest.fn();
    const { getByText, getAllByText } = render(
      <ServingSizePicker {...defaultProps} onSelect={onSelect} />
    );
    
    // Open modal
    fireEvent.press(getByText('100 g'));
    
    // Wait for modal to appear and select an option
    await waitFor(() => {
      const servingOption = getAllByText('1 serving')[0];
      fireEvent.press(servingOption);
    });
    
    expect(onSelect).toHaveBeenCalledWith('1serving');
  });

  it('shows Close button in modal', async () => {
    const { getByText } = render(<ServingSizePicker {...defaultProps} />);
    
    // Open modal
    fireEvent.press(getByText('100 g'));
    
    await waitFor(() => {
      expect(getByText('Close')).toBeTruthy();
    });
  });

  it('closes modal when Close is pressed', async () => {
    const onExpandedChange = jest.fn();
    const { getByText } = render(
      <ServingSizePicker {...defaultProps} onExpandedChange={onExpandedChange} />
    );
    
    // Open modal
    fireEvent.press(getByText('100 g'));
    
    await waitFor(() => {
      expect(getByText('Close')).toBeTruthy();
    });
    
    // Close modal
    fireEvent.press(getByText('Close'));
    
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('shows modal title "Serving Size"', async () => {
    const { getByText } = render(<ServingSizePicker {...defaultProps} />);
    
    // Open modal
    fireEvent.press(getByText('100 g'));
    
    await waitFor(() => {
      expect(getByText('Serving Size')).toBeTruthy();
    });
  });

  it('displays "Select" when no option matches selectedId', () => {
    const { getByText } = render(
      <ServingSizePicker {...defaultProps} selectedId="non-existent" />
    );
    
    expect(getByText('Select')).toBeTruthy();
  });
});
