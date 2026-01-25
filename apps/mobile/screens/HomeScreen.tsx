import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { DailyLog, formatMacroValue, MealFood } from '@meal-planning/shared';
import { getLogForDate, removeFoodFromDate } from '../utils/storage';
import FoodItem from '../components/FoodItem';
import CalendarPicker from '../components/CalendarPicker';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateLog, setSelectedDateLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<Swipeable | null>(null);
  
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

  useEffect(() => {
    loadDateLog();
    
    // Refresh when screen comes into focus
    const interval = setInterval(loadDateLog, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadDateLog = async () => {
    try {
      const dateString = formatDateString(selectedDate);
      const log = await getLogForDate(dateString);
      setSelectedDateLog(log);
    } catch (error) {
      console.error('Error loading date log:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSwipeWillOpen = (swipeable: Swipeable) => {
    // Close the currently open Swipeable if there is one
    if (currentOpenSwipeable.current && currentOpenSwipeable.current !== swipeable) {
      currentOpenSwipeable.current.close();
    }
    currentOpenSwipeable.current = swipeable;
  };

  const handleSwipeClose = () => {
    currentOpenSwipeable.current = null;
  };

  const handleRemoveFood = async (mealId: string, foodIndex: number, foodName: string) => {
    // Close all open Swipeables
    if (currentOpenSwipeable.current) {
      currentOpenSwipeable.current.close();
      currentOpenSwipeable.current = null;
    }
    swipeableRefs.current.forEach((swipeable) => {
      swipeable.close();
    });
    swipeableRefs.current.clear();

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
              await removeFoodFromDate(dateString, mealId, foodIndex);
              await loadDateLog(); // Refresh the log
            } catch (error) {
              console.error('Error removing food:', error);
              Alert.alert('Error', 'Failed to remove food. Please try again.');
            }
          },
        },
      ]
    );
  };

  const targetMacros = selectedDateLog?.targetMacros || {
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
    
    const targetMacros = selectedDateLog.targetMacros || {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const calculateCaloriesFromMacros = (macros: { protein: number; carbs: number; fat: number }) => {
    return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  };

  const handleScrollViewPress = () => {
    if (currentOpenSwipeable.current) {
      currentOpenSwipeable.current.close();
      currentOpenSwipeable.current = null;
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      onStartShouldSetResponder={() => {
        handleScrollViewPress();
        return false;
      }}
      onScrollBeginDrag={handleScrollViewPress}
    >
      <Text style={styles.title}>
        {isToday(selectedDate) ? "Today's Macros" : "Macros"}
      </Text>
      
      <View style={styles.dateContainer}>
        <TouchableOpacity
          onPress={goToPreviousDay}
          style={styles.dateNavButton}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
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
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
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
                        outputRange: ['#34c759', '#34c759', '#ff3b30'],
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

          {selectedDateLog && selectedDateLog.meals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isToday(selectedDate) ? "Today's Foods" : "Foods"}
              </Text>
              {selectedDateLog.meals.map(meal =>
                meal.foods.map((mealFood, index) => {
                  const itemKey = `${meal.id}-${mealFood.food.id}-${index}`;
                  return (
                    <FoodItem
                      key={itemKey}
                      mealFood={mealFood}
                      mealId={meal.id}
                      index={index}
                      totalItems={meal.foods.length}
                      onPress={() => {
                        // If any swipeable is open, close it instead of navigating
                        if (currentOpenSwipeable.current) {
                          currentOpenSwipeable.current.close();
                          currentOpenSwipeable.current = null;
                          return;
                        }
                        // Otherwise navigate normally
                        (navigation as any).navigate('FoodDetail', {
                          foodId: mealFood.food.id,
                          quantity: mealFood.quantity,
                          addedAt: mealFood.addedAt ? mealFood.addedAt.toISOString() : undefined,
                          mealId: meal.id,
                          foodIndex: index,
                          date: formatDateString(selectedDate),
                        });
                      }}
                      onRemove={() => handleRemoveFood(meal.id, index, mealFood.food.name)}
                      onSwipeableRef={(ref) => {
                        if (ref) {
                          swipeableRefs.current.set(itemKey, ref);
                        } else {
                          swipeableRefs.current.delete(itemKey);
                        }
                      }}
                      onSwipeWillOpen={handleSwipeWillOpen}
                      onSwipeClose={handleSwipeClose}
                      formatServingInfo={formatServingInfo}
                      formatTime={formatTime}
                      calculateCaloriesFromMacros={calculateCaloriesFromMacros}
                    />
                  );
                })
              )}
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateNavButton: {
    padding: 8,
  },
  dateTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  macroProgress: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  macroSeparator: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  macroTarget: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34c759',
    borderRadius: 3,
  },
});
