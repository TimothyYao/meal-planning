import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DailyLog, formatMacroValue, MealFood, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { getLogForDate, removeFoodFromDate, getUserTargetMacros, reorderFoodsInMeal } from '../storage';
import DraggableFoodList from '../components/DraggableFoodList';
import CalendarPicker from '../components/CalendarPicker';
import { setRefreshHomeScreen } from '../App';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateLog, setSelectedDateLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [userTargetMacros, setUserTargetMacros] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  
  // Animated values for progress bars
  const caloriesProgress = useRef(new Animated.Value(0)).current;
  const proteinProgress = useRef(new Animated.Value(0)).current;
  const carbsProgress = useRef(new Animated.Value(0)).current;
  const fatProgress = useRef(new Animated.Value(0)).current;

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadDateLog = useCallback(async () => {
    try {
      // Load user profile targets first (for fallback)
      const targets = await getUserTargetMacros();
      setUserTargetMacros(targets);
      
      const dateString = formatDateString(selectedDate);
      const log = await getLogForDate(dateString);
      setSelectedDateLog(log);
    } catch (error) {
      console.error('Error loading date log:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDateLog();
  }, [loadDateLog]);

  // Refresh when screen comes into focus (e.g., after copying food)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure data is written to cache
      const timer = setTimeout(() => {
        loadDateLog();
      }, 100);
      return () => clearTimeout(timer);
    }, [loadDateLog])
  );

  // Register refresh callback for external triggers (e.g., from FloatingAddMenu)
  useEffect(() => {
    setRefreshHomeScreen(() => {
      loadDateLog();
    });
    return () => {
      setRefreshHomeScreen(null);
    };
  }, [loadDateLog]);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleRemoveFood = useCallback(async (mealId: string, mealFood: MealFood, foodName: string) => {
    const dateLabel = isToday(selectedDate) ? "today's" : "this day's";
    Alert.alert(
      'Remove Food',
      `Remove ${foodName} from ${dateLabel} log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const dateString = formatDateString(selectedDate);
              
              // Find the current index of this item in the meal
              // We need to match by addedAt timestamp since that's unique per entry
              const meal = selectedDateLog?.meals.find(m => m.id === mealId);
              if (!meal) {
                console.error('Meal not found');
                return;
              }
              
              const currentIndex = meal.foods.findIndex(f => {
                // Match by addedAt timestamp if available
                if (mealFood.addedAt && f.addedAt) {
                  return f.addedAt.getTime() === mealFood.addedAt.getTime();
                }
                // Fallback: match by foodId and quantity (less reliable for duplicates)
                return f.foodId === mealFood.foodId && f.quantity === mealFood.quantity;
              });
              
              if (currentIndex === -1) {
                console.error('Food not found in meal');
                return;
              }
              
              await removeFoodFromDate(dateString, mealId, currentIndex);
              await loadDateLog(); // Refresh the log
            } catch (error) {
              console.error('Error removing food:', error);
              Alert.alert('Error', 'Failed to remove food. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedDate, selectedDateLog, loadDateLog]);

  const handleReorderFoods = useCallback(async (mealId: string, fromIndex: number, toIndex: number) => {
    try {
      const dateString = formatDateString(selectedDate);
      await reorderFoodsInMeal(dateString, mealId, fromIndex, toIndex);
      await loadDateLog(); // Refresh the log to show new order
    } catch (error) {
      console.error('Error reordering foods:', error);
    }
  }, [selectedDate, loadDateLog]);

  // Get target macros from log, or use user profile targets as fallback
  const targetMacros = selectedDateLog?.targetMacros || userTargetMacros || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  };

  const totalMacros = selectedDateLog?.totalMacros || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const getProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  // Animate progress bars when macros change
  useEffect(() => {
    if (!selectedDateLog) {
      // Reset to 0 if no log
      caloriesProgress.setValue(0);
      proteinProgress.setValue(0);
      carbsProgress.setValue(0);
      fatProgress.setValue(0);
      return;
    }
    
    const targetMacros = selectedDateLog.targetMacros || userTargetMacros || {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    };
    
    const totalMacros = selectedDateLog.totalMacros || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    
    const animateProgress = (animatedValue: Animated.Value, progress: number) => {
      Animated.timing(animatedValue, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false, // width animation doesn't support native driver
      }).start();
    };

    animateProgress(caloriesProgress, getProgress(totalMacros.calories, targetMacros.calories));
    animateProgress(proteinProgress, getProgress(totalMacros.protein, targetMacros.protein));
    animateProgress(carbsProgress, getProgress(totalMacros.carbs, targetMacros.carbs));
    animateProgress(fatProgress, getProgress(totalMacros.fat, targetMacros.fat));
  }, [selectedDateLog]);

  const formatNumber = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  };

  const formatServingSize = (size: number, unit: string) => {
    const sizeText = formatNumber(size);
    return unit ? `${sizeText} ${unit}` : sizeText;
  };

  const formatServingInfo = (quantity: number, servingSize: number, servingUnit: string) => {
    const qtyText = formatNumber(quantity);
    const label = quantity === 1 ? 'serving' : 'servings';
    return `${qtyText} ${label} • ${formatServingSize(servingSize, servingUnit)}`;
  };

  const formatTime = (date: Date | undefined) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateCaloriesFromMacros = useCallback((macros: { protein: number; carbs: number; fat: number }) => {
    return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  }, []);

  // Prepare food items for the draggable list
  const foodItems = useMemo(() => {
    if (!selectedDateLog || selectedDateLog.meals.length === 0) return [];
    
    return selectedDateLog.meals.flatMap(meal =>
      meal.foods.map((mealFood, index) => {
        // Use addedAt timestamp for unique key if available, otherwise fall back to index
        // This ensures duplicated foods have unique keys
        const uniqueId = mealFood.addedAt 
          ? mealFood.addedAt.getTime().toString() 
          : `${index}-${Date.now()}`;
        return {
          mealFood,
          mealId: meal.id,
          index,
          key: `${meal.id}-${uniqueId}`,
        };
      })
    );
  }, [selectedDateLog]);

  const handleItemPress = useCallback((item: { mealFood: MealFood; mealId: string; index: number }) => {
    // Find the current index of this item in the meal
    const meal = selectedDateLog?.meals.find(m => m.id === item.mealId);
    let currentIndex = item.index;
    
    if (meal) {
      const foundIndex = meal.foods.findIndex(f => {
        if (item.mealFood.addedAt && f.addedAt) {
          return f.addedAt.getTime() === item.mealFood.addedAt.getTime();
        }
        return f.foodId === item.mealFood.foodId && f.quantity === item.mealFood.quantity;
      });
      if (foundIndex !== -1) {
        currentIndex = foundIndex;
      }
    }
    
    (navigation as any).navigate('FoodDetail', {
      mealId: item.mealId,
      foodIndex: currentIndex,
      date: formatDateString(selectedDate),
      mealFood: item.mealFood,
    });
  }, [navigation, selectedDate, selectedDateLog]);

  const handleItemRemove = useCallback((item: { mealFood: MealFood; mealId: string; index: number }) => {
    handleRemoveFood(item.mealId, item.mealFood, item.mealFood.food.name);
  }, [handleRemoveFood]);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
    >
      <Text style={styles.title}>
        {isToday(selectedDate) ? "Today's Macros" : "Macros"}
      </Text>
      
      <View style={styles.dateContainer}>
        <TouchableOpacity
          onPress={goToPreviousDay}
          style={styles.dateNavButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setCalendarVisible(true)}
          style={styles.dateTextContainer}
        >
          <Text style={styles.dateText}>
            {isToday(selectedDate)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={goToNextDay}
          style={styles.dateNavButton}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <CalendarPicker
        visible={calendarVisible}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onClose={() => setCalendarVisible(false)}
      />

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Macros</Text>
            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroProgress}>
                  {Math.round(getProgress(totalMacros.calories, targetMacros.calories))}%
                </Text>
              </View>
              <View style={styles.macroValues}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(totalMacros.calories, 'calories')}
                </Text>
                <Text style={styles.macroSeparator}>/</Text>
                <Text style={styles.macroTarget}>
                  {formatMacroValue(targetMacros.calories, 'calories')}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: caloriesProgress.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: caloriesProgress.interpolate({
                        inputRange: [0, 100, 101],
                        outputRange: [colors.status.success, colors.status.success, colors.status.error],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroProgress}>
                    {Math.round(getProgress(totalMacros.protein, targetMacros.protein))}%
                  </Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroValue}>
                    {formatMacroValue(totalMacros.protein, 'grams')}
                  </Text>
                  <Text style={styles.macroSeparator}>/</Text>
                  <Text style={styles.macroTarget}>
                    {formatMacroValue(targetMacros.protein, 'grams')}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: proteinProgress.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroProgress}>
                    {Math.round(getProgress(totalMacros.carbs, targetMacros.carbs))}%
                  </Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroValue}>
                    {formatMacroValue(totalMacros.carbs, 'grams')}
                  </Text>
                  <Text style={styles.macroSeparator}>/</Text>
                  <Text style={styles.macroTarget}>
                    {formatMacroValue(targetMacros.carbs, 'grams')}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: carbsProgress.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroProgress}>
                    {Math.round(getProgress(totalMacros.fat, targetMacros.fat))}%
                  </Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={styles.macroValue}>
                    {formatMacroValue(totalMacros.fat, 'grams')}
                  </Text>
                  <Text style={styles.macroSeparator}>/</Text>
                  <Text style={styles.macroTarget}>
                    {formatMacroValue(targetMacros.fat, 'grams')}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: fatProgress.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {foodItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isToday(selectedDate) ? "Today's Foods" : "Foods"}
              </Text>
              <Text style={styles.reorderHint}>
                Hold and drag to reorder
              </Text>
              <DraggableFoodList
                items={foodItems}
                onItemPress={handleItemPress}
                onItemRemove={handleItemRemove}
                onReorder={handleReorderFoods}
                formatServingInfo={formatServingInfo}
                formatTime={formatTime}
                calculateCaloriesFromMacros={calculateCaloriesFromMacros}
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  dateNavButton: {
    padding: spacing.sm,
  },
  dateTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  dateText: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reorderHint: {
    fontSize: fontSize.xs,
    color: fontColor.quaternary,
    marginBottom: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    fontWeight: '500',
  },
  macroProgress: {
    fontSize: fontSize.xs,
    color: fontColor.tertiary,
    fontWeight: '600',
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  macroValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  macroSeparator: {
    fontSize: fontSize.base,
    color: fontColor.quaternary,
    marginHorizontal: spacing.sm,
  },
  macroTarget: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
    fontWeight: '500',
  },
  progressText: {
    fontSize: fontSize.xs,
    color: fontColor.tertiary,
    marginTop: spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.status.success,
    borderRadius: 3,
  },
});
