import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, MealFood, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { getRecentFoods } from '../storage';
import { safeGoBack } from '../utils/navigation';
import { addFoodToDate } from '../storage';

export default function AddFoodMenuScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [recentFoods, setRecentFoods] = useState<Array<{ food: FoodItem; lastAdded: Date }>>([]);
  const [loading, setLoading] = useState(false); // Start as false so menu shows immediately

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadRecentFoods = useCallback(async () => {
    setLoading(true);
    try {
      // Use requestIdleCallback or setTimeout to defer to next tick
      const foods = await Promise.resolve().then(() => getRecentFoods(5));
      setRecentFoods(foods);
    } catch (error) {
      console.error('Error loading recent foods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load in background after initial render, don't block UI
    // Use setTimeout to defer to next event loop tick
    const timer = setTimeout(() => {
      loadRecentFoods();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRecentFoods]);

  const handleCustomFood = () => {
    (navigation as any).navigate('AddFood');
  };

  const handleRecentFoodSelect = async (food: FoodItem) => {
    try {
      const today = new Date();
      const dateString = formatDateString(today);
      await addFoodToDate(food, 1, dateString);
      Alert.alert('Success', `Added ${food.name} to today's log`, [
        {
          text: 'OK',
          onPress: () => {
            safeGoBack(navigation);
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding recent food:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    }
  };

  const handleNutritionLabelScan = () => {
    // Placeholder for future implementation
    Alert.alert('Coming Soon', 'Nutrition label scan feature will be available soon.');
  };

  const handleCreateRecipe = () => {
    // Placeholder for future implementation
    Alert.alert('Coming Soon', 'Recipe creation feature will be available soon.');
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="slide"
      onRequestClose={() => safeGoBack(navigation)}
      hardwareAccelerated={true}
    >
      <Pressable 
        style={styles.backdrop}
        onPress={() => safeGoBack(navigation)}
      >
        <Pressable 
          style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          <View style={styles.header}>
            <Text style={styles.title}>Add Food</Text>
            <TouchableOpacity
              onPress={() => safeGoBack(navigation)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={fontColor.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.menuSection}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCustomFood}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="create-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Custom Food</Text>
                  <Text style={styles.menuItemSubtitle}>Create a new food item</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border.medium} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleNutritionLabelScan}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Nutrition Label Scan</Text>
                  <Text style={styles.menuItemSubtitle}>Scan a nutrition label</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border.medium} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCreateRecipe}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="restaurant-outline" size={22} color="#007AFF" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Create Recipe</Text>
                  <Text style={styles.menuItemSubtitle}>Combine multiple foods</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border.medium} />
              </TouchableOpacity>
            </View>

            {recentFoods.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Most Recent</Text>
                {recentFoods.slice(0, 5).map((item, index) => (
                  <TouchableOpacity
                    key={item.food.id}
                    style={[
                      styles.recentFoodItem,
                      index === Math.min(recentFoods.length - 1, 4) && styles.recentFoodItemLast
                    ]}
                    onPress={() => handleRecentFoodSelect(item.food)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentFoodContent}>
                      <Text style={styles.recentFoodName}>{item.food.name}</Text>
                      {item.food.brand && (
                        <Text style={styles.recentFoodBrand}>{item.food.brand}</Text>
                      )}
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 300,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.background.inverse,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.medium,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  scrollView: {
    flexGrow: 0,
  },
  content: {
    paddingBottom: spacing.sm,
  },
  menuSection: {
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.primary,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: fontColor.tertiary,
  },
  recentSection: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  recentFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
  },
  recentFoodItemLast: {
    borderBottomWidth: 0,
  },
  recentFoodContent: {
    flex: 1,
  },
  recentFoodName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: 2,
  },
  recentFoodBrand: {
    fontSize: 13,
    color: fontColor.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.tertiary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: fontColor.quaternary,
  },
});
