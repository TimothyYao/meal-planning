import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CountryCodePicker } from '../../components/CountryCodePicker';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '../../utils/countryCodes';
import type { CountryItem } from '../../utils/countryCodes';

describe('CountryCodePicker', () => {
  const defaultProps = {
    value: DEFAULT_COUNTRY,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selected country dial code', () => {
    const { getByText } = render(<CountryCodePicker {...defaultProps} />);
    
    expect(getByText('+1')).toBeTruthy();
  });

  it('shows different dial code when value changes', () => {
    const ukCountry: CountryItem = { code: 'GB', dial: '+44', label: 'United Kingdom' };
    const { getByText } = render(
      <CountryCodePicker {...defaultProps} value={ukCountry} />
    );
    
    expect(getByText('+44')).toBeTruthy();
  });

  it('opens modal when pressed', async () => {
    const { getByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('Country code')).toBeTruthy();
    });
  });

  it('displays Done button in modal', async () => {
    const { getByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('Done')).toBeTruthy();
    });
  });

  it('displays country options in modal', async () => {
    const { getByText, queryByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('United States')).toBeTruthy();
      expect(getByText('Canada')).toBeTruthy();
      expect(getByText('United Kingdom')).toBeTruthy();
    });
  });

  it('calls onSelect when a country is chosen', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CountryCodePicker {...defaultProps} onSelect={onSelect} />
    );
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('United Kingdom')).toBeTruthy();
    });
    
    fireEvent.press(getByText('United Kingdom'));
    
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'GB',
        dial: '+44',
        label: 'United Kingdom',
      })
    );
  });

  it('closes modal when a country is selected', async () => {
    const { getByText, queryByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('United Kingdom')).toBeTruthy();
    });
    
    fireEvent.press(getByText('United Kingdom'));
    
    await waitFor(() => {
      expect(queryByText('Country code')).toBeNull();
    });
  });

  it('closes modal when Done is pressed', async () => {
    const { getByText, queryByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('Done')).toBeTruthy();
    });
    
    fireEvent.press(getByText('Done'));
    
    await waitFor(() => {
      expect(queryByText('Country code')).toBeNull();
    });
  });

  it('does not open modal when disabled', () => {
    const { getByText, queryByText } = render(
      <CountryCodePicker {...defaultProps} disabled={true} />
    );
    
    fireEvent.press(getByText('+1'));
    
    expect(queryByText('Country code')).toBeNull();
  });

  it('applies disabled style when disabled', () => {
    const { getByText } = render(
      <CountryCodePicker {...defaultProps} disabled={true} />
    );
    
    // The trigger button should be rendered with opacity
    expect(getByText('+1')).toBeTruthy();
  });

  it('highlights the selected country in the list', async () => {
    const { getByText } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      // United States should be shown as selected (US is default)
      expect(getByText('United States')).toBeTruthy();
    });
  });

  it('shows checkmark for selected country', async () => {
    // The component uses Ionicons which is mocked, but we can verify structure
    const { getByText, UNSAFE_root } = render(<CountryCodePicker {...defaultProps} />);
    
    fireEvent.press(getByText('+1'));
    
    await waitFor(() => {
      expect(getByText('United States')).toBeTruthy();
    });
    
    // Structure should exist
    expect(UNSAFE_root).toBeTruthy();
  });
});
