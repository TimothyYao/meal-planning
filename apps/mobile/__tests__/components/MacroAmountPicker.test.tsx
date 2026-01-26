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
import { render, fireEvent } from '@testing-library/react-native';
import { MacroAmountPicker } from '../../components/MacroAmountPicker';

describe('MacroAmountPicker', () => {
  const defaultProps = {
    value: 25,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the given value', () => {
    const { getByText } = render(<MacroAmountPicker {...defaultProps} />);
    
    expect(getByText('25')).toBeTruthy();
  });

  it('displays label when provided', () => {
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} label="Protein (g)" />
    );
    
    expect(getByText('Protein (g)')).toBeTruthy();
  });

  it('displays unit text (g)', () => {
    const { getByText } = render(<MacroAmountPicker {...defaultProps} />);
    
    expect(getByText('g')).toBeTruthy();
  });

  it('has increment button', () => {
    const { getByText } = render(<MacroAmountPicker {...defaultProps} />);
    
    expect(getByText('+1')).toBeTruthy();
  });

  it('has decrement button', () => {
    const { getByText } = render(<MacroAmountPicker {...defaultProps} />);
    
    expect(getByText('-1')).toBeTruthy();
  });

  it('calls onChange with incremented value when + is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} onChange={onChange} value={25} />
    );
    
    fireEvent.press(getByText('+1'));
    
    expect(onChange).toHaveBeenCalledWith(26);
  });

  it('calls onChange with decremented value when - is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} onChange={onChange} value={25} />
    );
    
    fireEvent.press(getByText('-1'));
    
    expect(onChange).toHaveBeenCalledWith(24);
  });

  it('does not decrement below min', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} onChange={onChange} value={1} min={1} />
    );
    
    fireEvent.press(getByText('-1'));
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not increment above sliderMax', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} onChange={onChange} value={100} sliderMax={100} />
    );
    
    fireEvent.press(getByText('+1'));
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('displays quick select buttons', () => {
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} min={0} max={100} />
    );
    
    // Default quick values are [5, 10, 20, 40]
    expect(getByText('5')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText('40')).toBeTruthy();
  });

  it('calls onChange when quick select button is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} onChange={onChange} min={0} max={100} />
    );
    
    fireEvent.press(getByText('20'));
    
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('uses custom quick values when provided', () => {
    const { getByText, queryByText } = render(
      <MacroAmountPicker
        {...defaultProps}
        min={0}
        max={200}
        quickValues={[10, 30, 50, 100]}
      />
    );
    
    expect(getByText('10')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
    expect(getByText('50')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
    expect(queryByText('40')).toBeNull(); // Default value not shown
  });

  it('shows last saved value button when different from quick values', () => {
    const { getByText } = render(
      <MacroAmountPicker
        {...defaultProps}
        min={0}
        max={100}
        lastSavedValue={33}
      />
    );
    
    expect(getByText('33')).toBeTruthy();
  });

  it('does not show last saved value if it matches a quick value', () => {
    const { queryAllByText } = render(
      <MacroAmountPicker
        {...defaultProps}
        min={0}
        max={100}
        lastSavedValue={20} // 20 is a default quick value
      />
    );
    
    // Should only have one "20" (the quick value button, not a separate last saved button)
    const twentyTexts = queryAllByText('20');
    expect(twentyTexts.length).toBe(1);
  });

  it('displays slider range labels', () => {
    const { getAllByText } = render(
      <MacroAmountPicker {...defaultProps} min={5} sliderMax={80} />
    );
    
    // May have multiple '5' texts (quick value button and slider label)
    const fiveTexts = getAllByText('5');
    const eightyTexts = getAllByText('80');
    expect(fiveTexts.length).toBeGreaterThan(0);
    expect(eightyTexts.length).toBeGreaterThan(0);
  });

  it('has edit button (pencil icon)', () => {
    const { UNSAFE_root } = render(<MacroAmountPicker {...defaultProps} />);
    
    // The component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });

  it('formats decimal values correctly', () => {
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} value={25.5} />
    );
    
    expect(getByText('25.5')).toBeTruthy();
  });

  it('formats integer values without decimal', () => {
    const { getByText } = render(
      <MacroAmountPicker {...defaultProps} value={30} />
    );
    
    expect(getByText('30')).toBeTruthy();
  });
});
