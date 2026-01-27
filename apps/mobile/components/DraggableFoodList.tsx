import { useRef, useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Pressable } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MealFood, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface FoodItemData {
  mealFood: MealFood;
  mealId: string;
  index: number;
  key: string;
}

interface DraggableFoodListProps {
  items: FoodItemData[];
  onItemPress: (item: FoodItemData) => void;
  onItemRemove: (item: FoodItemData) => void;
  onReorder: (mealId: string, fromIndex: number, toIndex: number) => void;
  formatServingInfo: (quantity: number, servingSize: number, servingUnit: string) => string;
  formatTime: (date: Date) => string;
  calculateCaloriesFromMacros: (macros: { protein: number; carbs: number; fat: number }) => number;
}

function DraggableFoodItem({
  item,
  drag,
  isActive,
  onPress,
  onRemove,
  formatServingInfo,
  formatTime,
  calculateCaloriesFromMacros,
  onSwipeableRef,
  onSwipeWillOpen,
  onSwipeClose,
}: {
  item: FoodItemData;
  drag: () => void;
  isActive: boolean;
  onPress: () => void;
  onRemove: () => void;
  formatServingInfo: (quantity: number, servingSize: number, servingUnit: string) => string;
  formatTime: (date: Date) => string;
  calculateCaloriesFromMacros: (macros: { protein: number; carbs: number; fat: number }) => number;
  onSwipeableRef?: (ref: Swipeable | null) => void;
  onSwipeWillOpen?: (swipeable: Swipeable) => void;
  onSwipeClose?: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { mealFood } = item;

  const handleDelete = () => {
    swipeableRef.current?.close();
    setTimeout(() => {
      onRemove();
    }, 100);
  };

  const handleItemPress = () => {
    if (isOpen) {
      swipeableRef.current?.close();
      return;
    }
    onPress();
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
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
    <ScaleDecorator activeScale={1.02}>
      <Swipeable
        ref={(ref) => {
          (swipeableRef as any).current = ref;
          onSwipeableRef?.(ref);
        }}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        friction={2}
        enabled={!isActive}
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
          onSwipeClose?.();
        }}
        onSwipeableWillClose={() => {
          setIsOpen(false);
          onSwipeClose?.();
        }}
      >
        <Pressable
          style={[
            styles.foodItem,
            isActive && styles.foodItemActive,
          ]}
          onPress={handleItemPress}
          onLongPress={drag}
          delayLongPress={150}
          disabled={isActive}
        >
          <View style={styles.dragHandle}>
            <Ionicons
              name="reorder-three"
              size={20}
              color={isActive ? colors.primary : fontColor.quaternary}
            />
          </View>
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
    </ScaleDecorator>
  );
}

export default function DraggableFoodList({
  items,
  onItemPress,
  onItemRemove,
  onReorder,
  formatServingInfo,
  formatTime,
  calculateCaloriesFromMacros,
}: DraggableFoodListProps) {
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<Swipeable | null>(null);

  const handleSwipeWillOpen = useCallback((swipeable: Swipeable) => {
    if (currentOpenSwipeable.current && currentOpenSwipeable.current !== swipeable) {
      currentOpenSwipeable.current.close();
    }
    currentOpenSwipeable.current = swipeable;
  }, []);

  const handleSwipeClose = useCallback(() => {
    currentOpenSwipeable.current = null;
  }, []);

  const closeAllSwipeables = useCallback(() => {
    if (currentOpenSwipeable.current) {
      currentOpenSwipeable.current.close();
      currentOpenSwipeable.current = null;
    }
    swipeableRefs.current.forEach((swipeable) => {
      swipeable.close();
    });
  }, []);

  const handleItemPress = useCallback((item: FoodItemData) => {
    if (currentOpenSwipeable.current) {
      currentOpenSwipeable.current.close();
      currentOpenSwipeable.current = null;
      return;
    }
    onItemPress(item);
  }, [onItemPress]);

  const handleDragEnd = useCallback(({ data, from, to }: { data: FoodItemData[]; from: number; to: number }) => {
    if (from === to) return;
    
    // Close any open swipeables when reordering
    closeAllSwipeables();
    
    // All items should be from the same meal (we assume single meal structure)
    const mealId = data[0]?.mealId;
    if (mealId) {
      onReorder(mealId, from, to);
    }
  }, [onReorder, closeAllSwipeables]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<FoodItemData>) => {
    return (
      <DraggableFoodItem
        item={item}
        drag={drag}
        isActive={isActive}
        onPress={() => handleItemPress(item)}
        onRemove={() => onItemRemove(item)}
        formatServingInfo={formatServingInfo}
        formatTime={formatTime}
        calculateCaloriesFromMacros={calculateCaloriesFromMacros}
        onSwipeableRef={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.key, ref);
          } else {
            swipeableRefs.current.delete(item.key);
          }
        }}
        onSwipeWillOpen={handleSwipeWillOpen}
        onSwipeClose={handleSwipeClose}
      />
    );
  }, [handleItemPress, onItemRemove, formatServingInfo, formatTime, calculateCaloriesFromMacros, handleSwipeWillOpen, handleSwipeClose]);

  const keyExtractor = useCallback((item: FoodItemData) => item.key, []);

  return (
    <DraggableFlatList
      data={items}
      onDragEnd={handleDragEnd}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      containerStyle={styles.listContainer}
      activationDistance={10}
      onDragBegin={closeAllSwipeables}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    overflow: 'visible',
  },
  foodItem: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodItemActive: {
    backgroundColor: colors.background.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  dragHandle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
  },
  foodInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  foodDetails: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodName: {
    fontSize: fontSize.base,
    flex: 1,
  },
  foodServing: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginTop: spacing.xs,
  },
  foodTime: {
    fontSize: fontSize.xs,
    color: fontColor.quaternary,
    marginTop: 2,
  },
  foodRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  macroCompactNumber: {
    color: colors.primary,
  },
  macroCompactCalorieNumber: {
    color: fontColor.tertiary,
  },
  macroCompactLabel: {
    color: fontColor.tertiary,
  },
  deleteContainer: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: colors.cancel,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    paddingHorizontal: spacing.xl,
  },
  deleteButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: fontColor.inverse,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
