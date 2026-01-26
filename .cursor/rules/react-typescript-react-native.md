# React, TypeScript, and React Native Best Practices - Agent Instructions

## Overview

This project uses React 19, React Native 0.81, TypeScript 5.9, and Expo SDK 54. Follow these guidelines to write consistent, type-safe, and performant code.

## TypeScript Best Practices

### Type Imports
```typescript
// ✅ CORRECT - Use 'type' for type-only imports
import type { FoodItem, MacroTargets } from '@meal-planning/shared';
import { spacing, colors } from '@meal-planning/shared';

// ❌ WRONG - Mixed type and value imports without distinction
import { FoodItem, spacing } from '@meal-planning/shared';
```

### Interface vs Type
```typescript
// ✅ CORRECT - Use interface for component props
interface FoodItemProps {
  mealFood: MealFood;
  onPress: () => void;
  onRemove: () => void;
}

// ✅ CORRECT - Use type for unions, intersections, or computed types
type ButtonVariant = 'primary' | 'secondary' | 'cancel';
type WithChildren<T> = T & { children: React.ReactNode };

// ❌ WRONG - Using type for simple object shapes
type FoodItemProps = {
  mealFood: MealFood;
};
```

### Explicit Return Types
```typescript
// ✅ CORRECT - Explicit return types for public functions
export const calculateCalories = (macros: MacroTargets): number => {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
};

// ✅ CORRECT - Let inference work for simple internal functions
const formatValue = (val: number) => `${val}g`;
```

### Null/Undefined Handling
```typescript
// ✅ CORRECT - Use optional chaining
const name = food?.name ?? 'Unknown';

// ✅ CORRECT - Non-null assertion only when certain
const value = await AsyncStorage.getItem(KEY);
const parsed = JSON.parse(value!); // Only if you've validated it exists

// ❌ WRONG - Ignoring potential null
const name = food.name; // food might be undefined
```

### Generic Components
```typescript
// ✅ CORRECT - Properly typed generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={keyExtractor(item)}>{renderItem(item, index)}</View>
      ))}
    </View>
  );
}
```

## React Best Practices

### Function Components
```typescript
// ✅ CORRECT - Function component with typed props
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function Button({ title, onPress, disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

### Hooks

#### useState
```typescript
// ✅ CORRECT - Typed state with inference
const [count, setCount] = useState(0);

// ✅ CORRECT - Explicit type when initial value doesn't reflect full type
const [data, setData] = useState<FoodItem | null>(null);
const [items, setItems] = useState<FoodItem[]>([]);

// ❌ WRONG - Using any
const [data, setData] = useState<any>(null);
```

#### useEffect
```typescript
// ✅ CORRECT - Proper dependency array
useEffect(() => {
  loadData();
}, [userId]); // Only re-run when userId changes

// ✅ CORRECT - Cleanup function
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove();
}, []);

// ❌ WRONG - Missing dependencies
useEffect(() => {
  loadData(userId); // userId is used but not in deps
}, []);

// ❌ WRONG - Empty deps when deps exist (ESLint will catch this)
useEffect(() => {
  console.log(value);
}, []); // value should be in deps
```

#### useRef
```typescript
// ✅ CORRECT - Typed ref for DOM/native elements
const inputRef = useRef<TextInput>(null);

// ✅ CORRECT - Ref for mutable values
const intervalRef = useRef<NodeJS.Timeout | null>(null);

// ✅ CORRECT - Ref for component instances
const swipeableRef = useRef<Swipeable>(null);
```

#### useCallback and useMemo
```typescript
// ✅ CORRECT - Memoize callbacks passed to child components
const handlePress = useCallback(() => {
  setCount(c => c + 1);
}, []);

// ✅ CORRECT - Memoize expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// ❌ WRONG - Unnecessary memoization for simple values
const double = useMemo(() => count * 2, [count]); // Just use: const double = count * 2;
```

#### Custom Hooks
```typescript
// ✅ CORRECT - Custom hook with proper naming and return type
function useFoods(): { foods: FoodItem[]; loading: boolean; refresh: () => void } {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getFoods();
    setFoods(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { foods, loading, refresh };
}
```

### forwardRef Pattern
```typescript
// ✅ CORRECT - Properly typed forwardRef component
export interface FormRef {
  save: () => Promise<void>;
  isSaving: () => boolean;
}

interface FormProps {
  onSave: (data: FormData) => Promise<void>;
}

const Form = forwardRef<FormRef, FormProps>(({ onSave }, ref) => {
  const [isSaving, setIsSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving: () => isSaving,
  }));

  // ... component implementation
});

export default Form;
```

## React Native Best Practices

### StyleSheet
```typescript
// ✅ CORRECT - Use StyleSheet.create for performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: fontColor.primary,
  },
});

// ❌ WRONG - Inline styles (causes re-renders)
<View style={{ flex: 1, padding: 20 }}>
```

### Conditional Styles
```typescript
// ✅ CORRECT - Array syntax for conditional styles
<TouchableOpacity 
  style={[styles.button, disabled && styles.buttonDisabled]}
>

// ✅ CORRECT - Dynamic styles with StyleSheet
<View style={[styles.item, { marginTop: index === 0 ? 0 : spacing.md }]}>

// ❌ WRONG - Object spread for conditional (less performant)
<View style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : {}) }}>
```

### Touchables
```typescript
// ✅ CORRECT - Use Pressable for new components (recommended by RN)
<Pressable
  style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
  onPress={handlePress}
>
  <Text>Press Me</Text>
</Pressable>

// ✅ CORRECT - TouchableOpacity for simple use cases
<TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
  <Text>Press Me</Text>
</TouchableOpacity>

// ✅ CORRECT - TouchableOpacity with disabled state
<TouchableOpacity 
  onPress={handlePress} 
  disabled={isLoading}
  style={[styles.button, isLoading && styles.buttonDisabled]}
>
  <Text>{isLoading ? 'Loading...' : 'Submit'}</Text>
</TouchableOpacity>
```

### Lists
```typescript
// ✅ CORRECT - Use FlatList for long lists
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemComponent item={item} />}
  initialNumToRender={10}
  windowSize={5}
/>

// ✅ CORRECT - Use map for short, fixed lists
{items.map((item) => (
  <ItemComponent key={item.id} item={item} />
))}

// ❌ WRONG - Using ScrollView for dynamic data
<ScrollView>
  {items.map((item) => <Item key={item.id} item={item} />)}
</ScrollView>
```

### Images
```typescript
// ✅ CORRECT - Use expo-image for better performance
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>

// ✅ CORRECT - Use require for local images
<Image source={require('../assets/icon.png')} style={styles.icon} />
```

### Platform-Specific Code
```typescript
import { Platform } from 'react-native';

// ✅ CORRECT - Platform-specific values
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
});

// ✅ CORRECT - Platform.select for multiple platforms
const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 4,
  },
});
```

### Safe Area
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ CORRECT - Wrap screens in SafeAreaView
export default function Screen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Content />
    </SafeAreaView>
  );
}

// ✅ CORRECT - Use hooks for granular control
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Component() {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingBottom: insets.bottom }}>{/* ... */}</View>;
}
```

## Component Structure

### File Organization
```typescript
// 1. Imports - grouped and ordered
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FoodItem } from '@meal-planning/shared';
import { spacing, colors, fontColor } from '@meal-planning/shared';

// 2. Type definitions
interface ComponentProps {
  // ...
}

// 3. Constants (if any)
const ANIMATION_DURATION = 300;

// 4. Component
export default function Component({ prop1, prop2 }: ComponentProps) {
  // State
  const [state, setState] = useState(initialValue);

  // Refs
  const ref = useRef<ViewType>(null);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Callbacks
  const handlePress = useCallback(() => {
    // ...
  }, []);

  // Render helpers (if needed)
  const renderItem = (item: ItemType) => (
    <View key={item.id}>{/* ... */}</View>
  );

  // Main render
  return (
    <View style={styles.container}>
      {/* ... */}
    </View>
  );
}

// 5. Styles
const styles = StyleSheet.create({
  container: {
    // ...
  },
});
```

### Props Destructuring
```typescript
// ✅ CORRECT - Destructure with defaults in function signature
function Button({ 
  title, 
  onPress, 
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  // ...
}

// ❌ WRONG - Destructure inside function body
function Button(props: ButtonProps) {
  const { title, onPress, disabled = false } = props;
  // ...
}
```

## Async Operations

### Loading States
```typescript
// ✅ CORRECT - Proper loading state handling
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);
const [data, setData] = useState<DataType | null>(null);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchData();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;
return <DataDisplay data={data} />;
```

### Preventing Double Submissions
```typescript
// ✅ CORRECT - Disable button and prevent multiple calls
const [isSaving, setIsSaving] = useState(false);

const handleSave = async () => {
  if (isSaving) return; // Prevent double submission
  
  setIsSaving(true);
  try {
    await saveData();
  } finally {
    setIsSaving(false);
  }
};

<TouchableOpacity 
  onPress={handleSave} 
  disabled={isSaving}
  style={[styles.button, isSaving && styles.buttonDisabled]}
>
  <Text>{isSaving ? 'Saving...' : 'Save'}</Text>
</TouchableOpacity>
```

## Navigation

### Type-Safe Navigation
```typescript
// ✅ CORRECT - Typed navigation params
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  FoodDetail: { foodId: string };
  EditFood: { food: FoodItem };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function Component() {
  const navigation = useNavigation<NavigationProp>();
  
  const goToDetail = (foodId: string) => {
    navigation.navigate('FoodDetail', { foodId });
  };
}
```

## Error Handling

### Console Logging
```typescript
// ✅ CORRECT - Log errors with context
try {
  await saveFood(food);
} catch (error) {
  console.error('Error saving food:', error);
  // Handle error appropriately
}

// ❌ WRONG - Silent failures
try {
  await saveFood(food);
} catch (error) {
  // Nothing here
}
```

### User-Facing Errors
```typescript
// ✅ CORRECT - Show user-friendly error messages
import { Alert } from 'react-native';

const handleSave = async () => {
  try {
    await saveData();
    Alert.alert('Success', 'Your changes have been saved');
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert(
      'Error',
      'Failed to save changes. Please try again.',
      [{ text: 'OK' }]
    );
  }
};
```

## Performance

### Avoid Re-renders
```typescript
// ✅ CORRECT - Extract static data outside component
const OPTIONS = ['Option 1', 'Option 2', 'Option 3'];

function Select() {
  // OPTIONS doesn't change, no need to recreate
  return <Picker options={OPTIONS} />;
}

// ❌ WRONG - Recreating array on every render
function Select() {
  const options = ['Option 1', 'Option 2', 'Option 3']; // New array each render
  return <Picker options={options} />;
}
```

### Memoize Child Components
```typescript
// ✅ CORRECT - Memoize list item components
const FoodItem = memo(function FoodItem({ food, onPress }: FoodItemProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{food.name}</Text>
    </TouchableOpacity>
  );
});
```

## Reference

- React documentation: https://react.dev
- React Native documentation: https://reactnative.dev
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook
- Expo documentation: https://docs.expo.dev
