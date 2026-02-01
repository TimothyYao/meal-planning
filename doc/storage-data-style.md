# Storage Data Style Guide

This document describes the data storage patterns, serialization strategies, and architectural decisions used in the meal planning app's storage layer.

## Overview

The storage system uses a **write-through cache pattern** with AsyncStorage as the primary local storage and Firestore as the secondary cloud sync layer. This ensures fast local reads while maintaining multi-device synchronization capabilities.

## Storage Architecture

### Primary Storage: AsyncStorage
- **Purpose**: Fast local storage for immediate data access
- **Pattern**: Write-through cache (writes go to cache first, then sync to Firestore)
- **Benefits**: Offline-first support, instant UI updates, reduced latency

### Secondary Storage: Firestore
- **Purpose**: Cloud synchronization for multi-device support
- **Pattern**: Background sync (non-blocking, async operations)
- **Benefits**: Data persistence across devices, backup, and recovery

## Data Storage Keys

All storage keys follow the pattern `@meal_planning:<resource>`:

```typescript
DAILY_LOGS_KEY = '@meal_planning:daily_logs'
FOODS_KEY = '@meal_planning:foods'
RECENT_FOODS_CACHE_KEY = '@meal_planning:recent_foods_cache'
LAST_PROTEIN_KEY = '@meal_planning:last_protein'
LAST_CARBS_KEY = '@meal_planning:last_carbs'
LAST_FAT_KEY = '@meal_planning:last_fat'
LAST_DATE_KEY = '@meal_planning:last_date'
```

## Data Structures

### Daily Logs Storage Format

**Storage Structure**: `Record<string, SerializedDailyLog>`
- **Key**: Date string in `YYYY-MM-DD` format
- **Value**: Serialized DailyLog object (with Date objects converted to ISO strings)

**Example**:
```json
{
  "2026-01-25": {
    "date": "2026-01-25",
    "meals": [
      {
        "id": "uuid",
        "name": "Meal",
        "timestamp": "2026-01-25T12:00:00.000Z",
        "foods": [
          {
            "foodId": "food-uuid",
            "food": { /* FoodItem */ },
            "quantity": 1,
            "addedAt": "2026-01-25T12:00:00.000Z"
          }
        ],
        "macros": { "calories": 500, "protein": 30, "carbs": 50, "fat": 20 }
      }
    ],
    "totalMacros": { "calories": 500, "protein": 30, "carbs": 50, "fat": 20 },
    "targetMacros": { "calories": 2000, "protein": 150, "carbs": 200, "fat": 65 }
  }
}
```

### Foods Storage Format

**Storage Structure**: `FoodItem[]`
- **Type**: Array of FoodItem objects
- **No serialization needed**: FoodItem contains only primitive types and nested objects (no Date objects)

**Example**:
```json
[
  {
    "id": "food-uuid",
    "name": "Chicken Breast",
    "brand": "Brand Name",
    "barcode": "123456789",
    "macros": { "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6 },
    "servingSize": 100,
    "servingUnit": "g"
  }
]
```

### Recent Foods Cache Format

**Storage Structure**: `Array<{ food: FoodItem; lastAdded: string }>`
- **Purpose**: Fast retrieval of recently used foods
- **Caching Strategy**: Rebuilt on-demand when invalidated
- **Date Format**: ISO string (`lastAdded`)

**Example**:
```json
[
  {
    "food": { /* FoodItem */ },
    "lastAdded": "2026-01-25T12:00:00.000Z"
  }
]
```

## Serialization Patterns

### Date Serialization

**Problem**: AsyncStorage only stores strings, but DailyLog uses Date objects for timestamps.

**Solution**: Custom serialize/deserialize functions that convert Date objects to ISO strings for storage and back to Date objects when retrieved.

**Serialization** (`serializeDailyLog`):
- Converts `Date` objects to ISO strings (`toISOString()`)
- Handles nested Date objects in `Meal.timestamp` and `MealFood.addedAt`
- Preserves all other data structures

**Deserialization** (`deserializeDailyLog`):
- Converts ISO strings back to `Date` objects
- Handles both string and Date formats (for backward compatibility)
- Provides fallback to current date if timestamp is missing

**Example Flow**:
```typescript
// Before storage
const log: DailyLog = {
  date: "2026-01-25",
  meals: [{
    timestamp: new Date(), // Date object
    foods: [{
      addedAt: new Date() // Date object
    }]
  }]
};

// After serialization (for AsyncStorage)
const serialized = serializeDailyLog(log);
// { meals: [{ timestamp: "2026-01-25T12:00:00.000Z", ... }] }

// After deserialization (from AsyncStorage)
const deserialized = deserializeDailyLog(serialized);
// { meals: [{ timestamp: Date, ... }] }
```

### Firestore Compatibility

**Note**: Firestore natively supports Date objects, so when saving to Firestore:
- Use the deserialized DailyLog format (with Date objects)
- Convert serialized data back to DailyLog format before Firestore operations

## Data Access Patterns

### Read Pattern: Cache-First Strategy

1. **Check local cache first** (AsyncStorage)
   - Fast response for immediate UI updates
   - Works offline

2. **Background sync from Firestore** (if authenticated)
   - Non-blocking operation
   - Merges remote data with local cache
   - Updates cache for future reads

**Example**:
```typescript
// 1. Read from cache immediately
const localData = await AsyncStorage.getItem(KEY);

// 2. Return cached data (fast response)
return parseData(localData);

// 3. Sync from Firestore in background (non-blocking)
if (authenticated) {
  syncFromFirestore().then(updateCache);
}
```

### Write Pattern: Write-Through Cache

1. **Write to local cache first** (AsyncStorage)
   - Immediate availability
   - UI updates instantly

2. **Write to Firestore in background** (if authenticated)
   - Non-blocking operation
   - Errors don't block UI
   - Retry on next sync if failed

**Example**:
```typescript
// 1. Save to cache first
await AsyncStorage.setItem(KEY, serializeData(data));

// 2. Save to Firestore in background (non-blocking)
if (authenticated) {
  saveToFirestore(data).catch(handleError);
}
```

## Data Consistency Strategies

### Race Condition Prevention

The storage layer includes mechanisms to prevent race conditions:

1. **Snapshot Comparison**: Before updating from Firestore, compare the current local state with the snapshot taken at the start of the sync operation
2. **Food Count Validation**: Check if local deletions occurred (fewer foods) before overwriting with Firestore data
3. **Change Detection**: Only update if data actually differs (`areLogsDifferent` function)

### Conflict Resolution

- **Local-first**: Local changes take precedence during active editing
- **Background sync**: Firestore updates are applied only if local data hasn't changed
- **Deletion preservation**: Local deletions are preserved (won't be overwritten by Firestore)

## Macro Calculation

Macros are **calculated on-the-fly** rather than stored:

- **Meal macros**: Calculated from `MealFood[]` using `calculateMacros()`
- **Daily totals**: Calculated from all meal foods using `calculateMacros()`
- **Storage**: Only calculated values are stored (for performance)

**Formula**:
```typescript
macros = foods.reduce((total, mealFood) => {
  const multiplier = mealFood.quantity;
  return {
    calories: total.calories + mealFood.food.macros.calories * multiplier,
    protein: total.protein + mealFood.food.macros.protein * multiplier,
    carbs: total.carbs + mealFood.food.macros.carbs * multiplier,
    fat: total.fat + mealFood.food.macros.fat * multiplier,
  };
}, { calories: 0, protein: 0, carbs: 0, fat: 0 });
```

## Caching Strategies

### Recent Foods Cache

- **Purpose**: Fast retrieval of recently used foods
- **Invalidation**: Cache is invalidated when foods are added/removed
- **Rebuild**: Cache is rebuilt on-demand when accessed after invalidation
- **Storage**: Separate AsyncStorage key for isolation

### Target Macros Cache

- **Source of Truth**: User profile in Firestore
- **Fallback Chain**:
  1. Firestore user profile
  2. Today's log targetMacros
  3. Default values (2000 cal, 150g protein, 200g carbs, 65g fat)

## Error Handling Patterns

### Consistent Error Handling

All storage operations follow this pattern:

```typescript
try {
  // Operation
  await AsyncStorage.setItem(KEY, data);
  
  // Background Firestore sync (non-blocking)
  if (authenticated) {
    saveToFirestore(data).catch((error) => {
      console.error('Error syncing to Firestore:', error);
      // Don't throw - operation succeeded locally
    });
  }
} catch (error) {
  console.error('Error in operation:', error);
  throw error; // Only throw for local storage failures
}
```

### Error Recovery

- **Local failures**: Throw error (critical)
- **Firestore failures**: Log error, continue (non-critical, will retry on sync)
- **Sync failures**: Log error, don't block user operations

## Utility Functions

### ID Generation

- **Method**: `generateFoodId()` using `expo-crypto.randomUUID()`
- **Format**: Standard UUID v4
- **Usage**: Food items, meal IDs

### Date Formatting

- **Storage Format**: `YYYY-MM-DD` (ISO date format, local time)
- **Function**: `getTodayDate()` - returns current date in storage format
- **Timestamp Format**: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)

## Best Practices

1. **Always serialize before AsyncStorage**: Use `serializeDailyLog()` before storing DailyLog objects
2. **Always deserialize after AsyncStorage**: Use `deserializeDailyLog()` after reading DailyLog objects
3. **Non-blocking Firestore operations**: Never await Firestore operations in the main flow
4. **Cache invalidation**: Invalidate related caches when data changes (e.g., recent foods cache)
5. **Error logging**: Always log errors with context (function name, operation type)
6. **Type safety**: Use TypeScript types from `@meal-planning/shared` for all data structures

## Data Flow Examples

### Adding a Food to Today's Log

```
1. User action: addFoodToToday(food, quantity)
2. Read today's log from AsyncStorage (or create new)
3. Add MealFood to meal
4. Recalculate meal macros
5. Recalculate daily total macros
6. Serialize DailyLog
7. Save to AsyncStorage (write-through)
8. Invalidate recent foods cache (background)
9. Save to Firestore (background, non-blocking)
```

### Getting Today's Log

```
1. User action: getTodayLog()
2. Check if authenticated
3. If authenticated: Try Firestore first (for latest data)
4. Fallback to AsyncStorage (cache-first)
5. Deserialize DailyLog (convert ISO strings to Dates)
6. Ensure targetMacros are synced
7. Background: Check for Firestore updates (non-blocking)
8. Return DailyLog with Date objects
```

### Syncing from Firestore

```
1. Background operation: updateLogFromFirebaseIfDifferent()
2. Take snapshot of current local log
3. Fetch log from Firestore
4. Compare logs (areLogsDifferent)
5. Check if local changed during sync (race condition check)
6. Check if local has fewer foods (deletion check)
7. If safe to update: Serialize and save to AsyncStorage
8. Log operation for debugging
```

## Performance Considerations

1. **Batch Operations**: Multiple foods in a meal are processed together
2. **Lazy Calculation**: Macros calculated only when needed
3. **Cache Strategy**: Recent foods cached to avoid full log traversal
4. **Non-blocking Sync**: Firestore operations never block UI
5. **Selective Updates**: Only update changed data, not entire datasets

## Future Considerations

- **Incremental Sync**: Only sync changed data, not entire logs
- **Compression**: Compress large log data before storage
- **Indexing**: Add indexes for faster food lookups
- **Batch Writes**: Batch multiple Firestore writes together
- **Offline Queue**: Queue Firestore operations when offline, sync when online
