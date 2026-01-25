import { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MealFood, formatMacroValue } from '@meal-planning/shared';

interface FoodItemProps {
  mealFood: MealFood;
  mealId: string;
  index: number;
  totalItems: number;
  onPress: () => void;
  onRemove: () => void;
  onSwipeableRef?: (ref: Swipeable | null) => void;
  onSwipeWillOpen?: (swipeable: Swipeable) => void;
  onSwipeClose?: () => void;
  formatServingInfo: (quantity: number, servingSize: number, servingUnit: string) => string;
  formatTime: (date: Date) => string;
  calculateCaloriesFromMacros: (macros: { protein: number; carbs: number; fat: number }) => number;
}

export default function FoodItem({
  mealFood,
  onPress,
  onRemove,
  onSwipeableRef,
  onSwipeWillOpen,
  onSwipeClose,
  formatServingInfo,
  formatTime,
  calculateCaloriesFromMacros,
}: FoodItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (onSwipeableRef) {
      onSwipeableRef(swipeableRef.current);
    }
    return () => {
      if (onSwipeableRef) {
        onSwipeableRef(null);
      }
    };
  }, [onSwipeableRef]);

  const handleDelete = () => {
    swipeableRef.current?.close();
    // Small delay to allow the swipeable to close before removing
    setTimeout(() => {
      onRemove();
    }, 100);
  };

  const handleItemPress = () => {
    if (isOpen) {
      // If swipeable is open, close it instead of navigating
      swipeableRef.current?.close();
      return;
    }
    // If closed, navigate normally (but parent will check if any other swipeable is open)
    onPress();
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Animated.View style={[styles.deleteButtonContent, { transform: [{ scale }] }]}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      onSwipeableOpen={() => {
        setIsOpen(true);
        if (onSwipeWillOpen && swipeableRef.current) {
          onSwipeWillOpen(swipeableRef.current);
        }
      }}
      onSwipeableWillOpen={() => {
        if (onSwipeWillOpen && swipeableRef.current) {
          onSwipeWillOpen(swipeableRef.current);
        }
      }}
      onSwipeableClose={() => {
        setIsOpen(false);
        if (onSwipeClose) {
          onSwipeClose();
        }
      }}
      onSwipeableWillClose={() => {
        setIsOpen(false);
        if (onSwipeClose) {
          onSwipeClose();
        }
      }}
    >
      <Pressable
        style={styles.foodItem}
        onPress={handleItemPress}
      >
        <View style={styles.foodInfo}>
          <View style={styles.foodDetails}>
            <Text style={styles.foodName}>{mealFood.food.name}</Text>
            <Text style={styles.foodServing}>
              {formatServingInfo(
                mealFood.quantity,
                mealFood.food.servingSize,
                mealFood.food.servingUnit
              )}
            </Text>
            {mealFood.addedAt && (
              <Text style={styles.foodTime}>
                {formatTime(mealFood.addedAt)}
              </Text>
            )}
          </View>
          <View style={styles.foodRightSection}>
            <View style={styles.macroCompact}>
              <Text style={styles.macroCompactRow}>
                <Text style={styles.macroCompactNumber}>
                  {Math.round(mealFood.food.macros.protein * mealFood.quantity)}
                </Text>
                <Text style={styles.macroCompactLabel}>P/</Text>
                <Text style={styles.macroCompactNumber}>
                  {Math.round(mealFood.food.macros.carbs * mealFood.quantity)}
                </Text>
                <Text style={styles.macroCompactLabel}>C/</Text>
                <Text style={styles.macroCompactNumber}>
                  {Math.round(mealFood.food.macros.fat * mealFood.quantity)}
                </Text>
                <Text style={styles.macroCompactLabel}>F</Text>
              </Text>
              <Text style={styles.macroCompactCalories}>
                <Text style={styles.macroCompactCalorieNumber}>
                  {Math.round(calculateCaloriesFromMacros(mealFood.food.macros) * mealFood.quantity)}
                </Text>
                <Text style={styles.macroCompactLabel}> calories</Text>
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  foodItem: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  foodDetails: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: 16,
    flex: 1,
  },
  foodServing: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  foodTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  foodRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroCompact: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'flex-end',
  },
  macroCompactRow: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroCompactCalories: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroCompactNumber: {
    color: '#007AFF',
  },
  macroCompactCalorieNumber: {
    color: '#666',
  },
  macroCompactLabel: {
    color: '#666',
  },
  deleteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#ff3b30',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    paddingHorizontal: 20,
  },
  deleteButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
