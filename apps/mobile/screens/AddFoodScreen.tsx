import { StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { FoodItem, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { saveFood, addFoodToDate } from '../storage';
import FoodForm, { FoodFormRef } from '../components/FoodForm';
import { safeGoBack } from '../utils/navigation';

type AddFoodRouteParams = {
  duplicateFood?: FoodItem;
};

type AddFoodRouteProp = RouteProp<{ AddFood: AddFoodRouteParams }, 'AddFood'>;

export default function AddFoodScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<AddFoodRouteProp>();
  const duplicateFood = route.params?.duplicateFood;
  const formRef = useRef<FoodFormRef>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const handleSave = async (foodItem: FoodItem, quantity: number, date?: Date) => {
    if (isSaving) return; // Prevent multiple saves
    
    setIsSaving(true);
    try {
      // Save food to database (cache first, then Firebase)
      await saveFood(foodItem);
      
      // Add to selected date's log
      const selectedDate = date || new Date();
      const dateString = formatDateString(selectedDate);
      await addFoodToDate(foodItem, quantity, dateString);

      const dateLabel = isToday(selectedDate) ? "today's" : "the selected date's";
      Alert.alert('Success', `Added ${foodItem.name} to ${dateLabel} log`, [
        {
          text: 'OK',
          onPress: () => {
            safeGoBack(navigation);
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert('Error', 'Failed to save food. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidationError = (message: string) => {
    Alert.alert('Error', message);
  };

  const handleSavePress = async () => {
    if (isSaving || !formRef.current) return;
    await formRef.current.save();
  };

  const handleCancel = () => {
    if (isSaving) return; // Prevent cancel during save
    safeGoBack(navigation);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: insets.top + 20,
            paddingBottom: 100 + insets.bottom,
          }
        ]}
      >
        <Text style={styles.title}>Add Food</Text>

        <FoodForm
          ref={formRef}
          initialFood={duplicateFood}
          initialDate={new Date()}
          onSave={handleSave}
          showQuantity={true}
          showDate={true}
          hideSaveButton={true}
          onValidationError={handleValidationError}
          noPadding={true}
        />
      </ScrollView>

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, isSaving && styles.buttonDisabled]} 
          onPress={handleCancel}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.buttonDisabled]} 
          onPress={handleSavePress}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={fontColor.inverse} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    marginBottom: spacing.xl,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    shadowColor: colors.background.inverse,
    shadowOffset: {
      width: 0,
      height: -1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 100,
  },
  saveButtonText: {
    color: fontColor.inverse,
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '400',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
