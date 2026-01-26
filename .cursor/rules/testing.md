# Testing Best Practices - Agent Instructions

## Overview

This project uses Jest and React Testing Library for testing. Follow these guidelines to write consistent, maintainable, and effective tests.

## Tech Stack

- **Jest** - Test runner and assertion library
- **@testing-library/react-native** - React Native component testing
- **jest-expo** - Expo-specific Jest preset

## Test File Organization

### File Location
- Tests live in `__tests__/` directories alongside the code they test
- Component tests: `__tests__/components/ComponentName.test.tsx`
- Storage/utility tests: `__tests__/storage/moduleName.test.ts`
- Integration tests: `__tests__/*.integration.test.ts`

### File Naming
- **ALWAYS** use `.test.tsx` for component tests (TypeScript + JSX)
- **ALWAYS** use `.test.ts` for non-component tests (pure TypeScript)
- **NEVER** mix `.spec.ts` and `.test.ts` naming - use `.test.ts` consistently

## Writing Component Tests

### Import Pattern
```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ComponentName from '../../components/ComponentName';
import type { SomeType } from '@meal-planning/shared';
```

### Test Structure
```typescript
describe('ComponentName', () => {
  // Sample data - define at the top of describe block
  const sampleData: DataType = {
    id: 'test-123',
    name: 'Test Item',
    // ... other required fields
  };

  const defaultProps = {
    data: sampleData,
    onAction: jest.fn(),
    // ... other required props
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Group related tests
  describe('rendering', () => {
    it('renders the component', () => {
      const { getByText } = render(<ComponentName {...defaultProps} />);
      expect(getByText('Expected Text')).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('calls handler when button is pressed', () => {
      const onAction = jest.fn();
      const { getByText } = render(
        <ComponentName {...defaultProps} onAction={onAction} />
      );
      
      fireEvent.press(getByText('Button Text'));
      
      expect(onAction).toHaveBeenCalled();
    });
  });
});
```

### Query Priority
Use queries in this order of preference:
1. `getByText` / `queryByText` - For visible text content
2. `getByPlaceholderText` - For input placeholders
3. `getByTestId` - Only when other queries aren't suitable (add `testID` prop)

**Examples:**
```typescript
// ✅ CORRECT - Query by visible text
const { getByText } = render(<Component />);
expect(getByText('Save Food')).toBeTruthy();

// ✅ CORRECT - Query by placeholder
const nameInput = getByPlaceholderText('e.g., Chicken Breast');
fireEvent.changeText(nameInput, 'Test Food');

// ✅ CORRECT - Use queryByText for asserting absence
const { queryByText } = render(<Component />);
expect(queryByText('Hidden Element')).toBeNull();

// ❌ WRONG - Using getBy for absence checks (throws if not found)
expect(getByText('Hidden Element')).toBeNull();
```

### Async Testing
```typescript
// ✅ CORRECT - Use waitFor for async operations
it('shows loading then results', async () => {
  const { getByText } = render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(getByText('Loaded Content')).toBeTruthy();
  });
});

// ✅ CORRECT - Async handlers
it('calls async onSave', async () => {
  const onSave = jest.fn(() => Promise.resolve());
  const { getByText } = render(<Form onSave={onSave} />);
  
  fireEvent.press(getByText('Save'));
  
  await waitFor(() => {
    expect(onSave).toHaveBeenCalled();
  });
});
```

## Mocking

### Module Mocking
```typescript
// Mock at the top of the file, before imports that use it
jest.mock('../../storage', () => ({
  getLastProtein: jest.fn(() => Promise.resolve(null)),
  saveLastProtein: jest.fn(() => Promise.resolve()),
  generateFoodId: jest.fn(() => Promise.resolve('new-food-id')),
}));

// For React Native modules that need special handling
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  __esModule: true,
  default: {
    get: jest.fn((dim) => ({
      window: { width: 375, height: 812, scale: 2, fontScale: 1 },
      screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
    }[dim])),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
```

### Alert Mocking
```typescript
import { Alert } from 'react-native';

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    // Auto-confirm by calling the confirm button
    const confirmButton = buttons?.find(b => b.text === 'Save') || buttons?.[0];
    if (confirmButton?.onPress) {
      confirmButton.onPress();
    }
  });
});

// Test alert was shown with correct content
it('shows confirmation alert', async () => {
  // ... trigger action
  
  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      'Alert Title',
      'Alert message',
      expect.any(Array)
    );
  });
});
```

### AsyncStorage Mocking
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Storage Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('saves data correctly', async () => {
    await saveItem(testData);
    
    const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(storedJson!);
    
    expect(stored).toEqual(testData);
  });
});
```

## Testing Patterns

### Props Testing
```typescript
// Test default props
it('uses default button text', () => {
  const { getByText } = render(<Form {...defaultProps} />);
  expect(getByText('Save Food')).toBeTruthy();
});

// Test custom props
it('shows custom button text', () => {
  const { getByText } = render(
    <Form {...defaultProps} buttonText="Add Food" />
  );
  expect(getByText('Add Food')).toBeTruthy();
});

// Test boolean props
it('hides element when prop is true', () => {
  const { queryByText } = render(
    <Form {...defaultProps} hideSaveButton={true} />
  );
  expect(queryByText('Save Food')).toBeNull();
});
```

### Event Handler Testing
```typescript
it('calls onPress with correct arguments', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <Component {...defaultProps} onPress={onPress} />
  );
  
  fireEvent.press(getByText('Click Me'));
  
  // Check handler was called
  expect(onPress).toHaveBeenCalled();
  
  // Check arguments if applicable
  expect(onPress).toHaveBeenCalledWith(expectedArg);
});
```

### Form Input Testing
```typescript
it('updates input value', () => {
  const { getByPlaceholderText } = render(<Form {...defaultProps} />);
  
  const input = getByPlaceholderText('Enter name');
  fireEvent.changeText(input, 'New Value');
  
  expect(input.props.value).toBe('New Value');
});
```

### Validation Testing
```typescript
it('shows validation error when required field is empty', async () => {
  const onValidationError = jest.fn();
  const { getByText } = render(
    <Form {...defaultProps} onValidationError={onValidationError} />
  );
  
  fireEvent.press(getByText('Save'));
  
  await waitFor(() => {
    expect(onValidationError).toHaveBeenCalledWith('Please enter a name');
  });
});
```

## What to Test

### DO Test
- Component renders correctly with required props
- Component renders with optional props
- User interactions (press, change text, scroll)
- Conditional rendering (show/hide based on props)
- Event handlers are called with correct arguments
- Validation logic
- Async operations complete successfully
- Edge cases (empty data, null values, boundary conditions)

### DON'T Test
- Implementation details (internal state, private methods)
- Third-party library internals
- Styles (unless critical to functionality)
- Exact text matching when meaning is sufficient

## Test Data Best Practices

### Use Realistic Data
```typescript
// ✅ CORRECT - Realistic test data
const sampleFood: FoodItem = {
  id: 'food-123',
  name: 'Chicken Breast',
  macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  servingSize: 100,
  servingUnit: 'g',
};

// ❌ WRONG - Lazy placeholder data
const sampleFood = {
  id: 'x',
  name: 'test',
  macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
};
```

### Type Your Test Data
```typescript
// ✅ CORRECT - Explicitly typed
const sampleData: DataType = { ... };

// ❌ WRONG - Implicitly typed
const sampleData = { ... };
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- ComponentName.test.tsx

# Run with coverage
npm test -- --coverage
```

## Common Pitfalls

### 1. Forgetting to Clear Mocks
```typescript
// ✅ CORRECT
beforeEach(() => {
  jest.clearAllMocks();
});

// ❌ WRONG - Mocks retain state between tests
```

### 2. Using getBy for Null Checks
```typescript
// ✅ CORRECT - queryBy returns null if not found
expect(queryByText('Missing')).toBeNull();

// ❌ WRONG - getBy throws if not found
expect(getByText('Missing')).toBeNull();
```

### 3. Not Waiting for Async Operations
```typescript
// ✅ CORRECT
await waitFor(() => {
  expect(getByText('Loaded')).toBeTruthy();
});

// ❌ WRONG - May pass before async completes
expect(getByText('Loaded')).toBeTruthy();
```

### 4. Over-Mocking
```typescript
// ✅ CORRECT - Mock only external dependencies
jest.mock('../../storage', () => ({ ... }));

// ❌ WRONG - Mocking the component you're testing
jest.mock('../../components/MyComponent');
```

## Reference

- Jest documentation: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/react-native-testing-library/intro
- Jest config: `apps/mobile/jest.config.js`
- Jest setup: `apps/mobile/jest.setup.js`, `apps/mobile/jest.setupBefore.js`
