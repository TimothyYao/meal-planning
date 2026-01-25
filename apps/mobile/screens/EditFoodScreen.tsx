import { StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { FoodItem } from '@meal-planning/shared';
import { saveFood, getFoodById, updateFoodQuantityInDate, moveFoodToDate, getTodayDate } from '../utils/storage';
import FoodForm, { FoodFormRef } from '../components/FoodForm';

import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

type EditFoodRouteParams = {
  foodId: string;
  mealId?: string;
  foodIndex?: number;
  date?: string; // YYYY-MM-DD format
  quantity?: number;
};

type EditFoodRouteProp = RouteProp<{ EditFood: EditFoodRouteParams }, 'EditFood'>;

export default function EditFoodScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<EditFoodRouteProp>();
  const { foodId, mealId, foodIndex, date, quantity: initialQuantity = 1 } = route.params;
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuantity, setCurrentQuantity] = useState(initialQuantity);
  const formRef = useRef<FoodFormRef>(null);
  const isExistingLog = mealId !== undefined && foodIndex !== undefined;

  // Load food data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadFood = async () => {
        setLoading(true);
        const loadedFood = await getFoodById(foodId);
        if (loadedFood) {
          setFood(loadedFood);
        }
        setLoading(false);
      };
      loadFood();
    }, [foodId])
  );

  const handleSave = async (editedFood: FoodItem, quantity: number, newDate?: Date) => {
    try {
      await saveFood(editedFood);
      
      // If this is an existing log entry, update the quantity and potentially move the date
      if (isExistingLog && mealId && foodIndex !== undefined) {
        const oldDate = date || getTodayDate();
        const newDateString = newDate ? formatDateString(newDate) : oldDate;
        
        // Update quantity from the form
        setCurrentQuantity(quantity);
        
        // If date changed, move the food to the new date
        if (newDateString !== oldDate) {
          await moveFoodToDate(oldDate, newDateString, mealId, foodIndex);
        } else {
          // Just update the quantity if date didn't change
          await updateFoodQuantityInDate(oldDate, mealId, foodIndex, quantity);
        }
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error updating food:', error);
      Alert.alert('Error', 'Failed to update food. Please try again.');
    }
  };

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  const handleValidationError = (message: string) => {
    Alert.alert('Error', message);
  };

  const handleSavePress = async () => {
    if (formRef.current) {
      await formRef.current.save();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loading || !food) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>Edit Food</Text>
        <FoodForm
          ref={formRef}
          initialFood={food}
          initialQuantity={currentQuantity.toString()}
          initialDate={date ? new Date(date + 'T00:00:00') : new Date()}
          onSave={handleSave}
          showQuantity={true}
          showDate={isExistingLog}
          hideSaveButton={true}
          onValidationError={handleValidationError}
          noPadding={true}
        />
      </ScrollView>

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSavePress}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 100,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
});
