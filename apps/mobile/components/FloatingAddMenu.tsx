import { StyleSheet, View, TouchableOpacity, Animated, Modal, Pressable, Text, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem } from '@meal-planning/shared';
import { getRecentFoods, addFoodToDate } from '../storage';
import { triggerHomeScreenRefresh } from '../App';

const SPACING = 8;

interface FloatingAddMenuProps {
  visible: boolean;
  onClose: () => void;
  onCustomFood: () => void;
  onSearch: () => void;
  onCreateRecipe: () => void;
}

export default function FloatingAddMenu({
  visible,
  onClose,
  onCustomFood,
  onSearch,
  onCreateRecipe,
}: FloatingAddMenuProps) {
  const insets = useSafeAreaInsets();
  const [recentFoods, setRecentFoods] = useState<Array<{ food: FoodItem; lastAdded: Date }>>([]);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const bottomOffset = screenHeight * 0.1; // 10% from bottom

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (visible) {
      loadRecentFoods();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadRecentFoods = async () => {
    try {
      const foods = await getRecentFoods(5);
      setRecentFoods(foods);
    } catch (error) {
      console.error('Error loading recent foods:', error);
    }
  };

  const handleRecentFood = async (food: FoodItem) => {
    try {
      const today = new Date();
      const dateString = formatDateString(today);
      await addFoodToDate(food, 1, dateString);
      
      // Close menu
      onClose();
      
      // Refresh the display - same pattern as handleRemoveFood in HomeScreen
      triggerHomeScreenRefresh();
    } catch (error) {
      console.error('Error adding recent food:', error);
    }
  };

  const handleNutritionLabelScan = () => {
    onClose();
    Alert.alert('Coming Soon', 'Nutrition label scan feature will be available soon.');
  };

  const handleCreateRecipe = () => {
    onClose();
    onCreateRecipe();
  };

  const handleSearch = () => {
    onClose();
    onSearch();
  };

  if (!visible) return null;

  const recipeButton = { icon: 'restaurant-outline' as const, label: 'Recipe', onPress: handleCreateRecipe, color: '#007AFF' };
  const scanButton = { icon: 'camera-outline' as const, label: 'Scan', onPress: handleNutritionLabelScan, color: '#007AFF' };
  const customButton = { icon: 'create-outline' as const, label: 'Custom', onPress: onCustomFood, color: '#007AFF' };
  const searchButton = { icon: 'search-outline' as const, label: 'Search', onPress: handleSearch, color: '#007AFF' };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated={true}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.wrapper}>
          <View style={[styles.container, { bottom: bottomOffset }]}>
            {/* Recipe button on top */}
            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                  marginBottom: SPACING,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.squareButton, { backgroundColor: recipeButton.color }]}
                onPress={recipeButton.onPress}
                activeOpacity={0.8}
              >
                <Ionicons name={recipeButton.icon} size={24} color="#fff" />
                <Text style={styles.buttonLabel}>{recipeButton.label}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Scan on left, Custom in middle, History on right */}
            <Animated.View
              style={[
                styles.buttonsRow,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Scan button on left */}
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [{ translateY: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }) }],
                    marginRight: SPACING,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.squareButton, { backgroundColor: scanButton.color }]}
                  onPress={scanButton.onPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name={scanButton.icon} size={24} color="#fff" />
                  <Text style={styles.buttonLabel}>{scanButton.label}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Custom button in middle */}
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [{ translateY: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }) }],
                    marginRight: SPACING,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.squareButton, { backgroundColor: customButton.color }]}
                  onPress={customButton.onPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name={customButton.icon} size={24} color="#fff" />
                  <Text style={styles.buttonLabel}>{customButton.label}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* History button on right */}
              {recentFoods.length > 0 && (
                <Animated.View
                  style={[
                    styles.buttonWrapper,
                    {
                      transform: [{ translateY: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }) }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.squareButton, { backgroundColor: '#007AFF' }]}
                    onPress={() => handleRecentFood(recentFoods[0].food)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={20} color="#fff" />
                    <Text style={styles.recentButtonText} numberOfLines={1}>
                      {recentFoods[0].food.name}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>

            {/* Search button in third row */}
            <Animated.View
              style={[
                styles.buttonWrapper,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                  marginTop: SPACING,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.squareButton, { backgroundColor: searchButton.color }]}
                onPress={searchButton.onPress}
                activeOpacity={0.8}
              >
                <Ionicons name={searchButton.icon} size={24} color="#fff" />
                <Text style={styles.buttonLabel}>{searchButton.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  squareButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingHorizontal: 4,
  },
  buttonLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  recentButtonContainer: {
    alignItems: 'center',
  },
  recentButtonText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 56,
  },
});
