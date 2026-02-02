import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface RecipeFoodPickerModalProps {
  visible: boolean;
  foods: FoodItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectFood: (food: FoodItem) => void;
  onClose: () => void;
}

export default function RecipeFoodPickerModal({
  visible,
  foods,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectFood,
  onClose,
}: RecipeFoodPickerModalProps) {
  const insets = useSafeAreaInsets();

  const hasFoods = useMemo(() => foods.length > 0, [foods.length]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={26} color={fontColor.secondary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select ingredient</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={fontColor.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recent foods"
            placeholderTextColor={fontColor.tertiary}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !hasFoods ? (
          <View style={styles.emptyFoods}>
            <Ionicons name="time-outline" size={32} color={fontColor.tertiary} />
            <Text style={styles.emptyTitle}>No recent foods</Text>
            <Text style={styles.emptySubtitle}>
              Add foods from the Add Food tab to build recipes here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.foodList}>
            {foods.map((food) => (
              <TouchableOpacity
                key={food.id}
                style={styles.foodItem}
                onPress={() => onSelectFood(food)}
              >
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
                  <Text style={styles.foodMacros}>
                    {Math.round(food.macros.calories)} cal • {food.macros.protein}g P •{' '}
                    {food.macros.carbs}g C • {food.macros.fat}g F
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.secondary,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    color: fontColor.primary,
  },
  foodList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  foodInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: 2,
  },
  foodBrand: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginBottom: 2,
  },
  foodMacros: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFoods: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.secondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
