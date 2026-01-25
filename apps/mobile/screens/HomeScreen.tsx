import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { DailyLog, formatMacroValue, MealFood } from '@meal-planning/shared';
import { getTodayLog, removeFoodFromToday } from '../utils/storage';
import FoodItem from '../components/FoodItem';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<Swipeable | null>(null);

  useEffect(() => {
    loadTodayLog();
    
    // Refresh when screen comes into focus
    const interval = setInterval(loadTodayLog, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTodayLog = async () => {
    try {
      const log = await getTodayLog();
      setTodayLog(log);
    } catch (error) {
      console.error('Error loading today log:', error);
    } finally {
      setLoading(false);
    }
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

    Alert.alert(
      'Remove Food',
      `Remove ${foodName} from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFoodFromToday(mealId, foodIndex);
              await loadTodayLog(); // Refresh the log
            } catch (error) {
              console.error('Error removing food:', error);
              Alert.alert('Error', 'Failed to remove food. Please try again.');
            }
          },
        },
      ]
    );
  };

  const targetMacros = todayLog?.targetMacros || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  };

  const totalMacros = todayLog?.totalMacros || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const getProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

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
      <Text style={styles.title}>Today's Macros</Text>
      
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

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
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getProgress(totalMacros.calories, targetMacros.calories)}%`,
                      backgroundColor:
                        getProgress(totalMacros.calories, targetMacros.calories) > 100
                          ? '#ff3b30'
                          : '#34c759',
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
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgress(totalMacros.protein, targetMacros.protein)}%`,
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
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgress(totalMacros.carbs, targetMacros.carbs)}%`,
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
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgress(totalMacros.fat, targetMacros.fat)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {todayLog && todayLog.meals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Foods</Text>
              {todayLog.meals.map(meal =>
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
                          food: mealFood.food,
                          quantity: mealFood.quantity,
                          addedAt: mealFood.addedAt ? mealFood.addedAt.toISOString() : undefined,
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
    marginBottom: 24,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
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
