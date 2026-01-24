import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { FoodItem, MacroTargets } from '@meal-planning/shared';
import { saveFood, addFoodToToday } from '../utils/storage';
import { ServingOption, ServingSizePicker } from '../components/ServingSizePicker';

const SERVING_OPTIONS: ServingOption[] = [
  { id: '100g', value: 100, unit: 'g', label: '100 g' },
  { id: '1cup', value: 240, unit: 'ml', label: '1 cup (240 ml)' },
  { id: '1tbsp', value: 15, unit: 'ml', label: '1 tbsp (15 ml)' },
  { id: '1tsp', value: 5, unit: 'ml', label: '1 tsp (5 ml)' },
  { id: '1piece', value: 1, unit: 'piece', label: '1 piece' },
  { id: '1slice', value: 1, unit: 'slice', label: '1 slice' },
  { id: '1serving', value: 1, unit: 'serving', label: '1 serving' },
];

const DEFAULT_SERVING_ID = '100g';

export default function AddFoodScreen() {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedServingId, setSelectedServingId] = useState(DEFAULT_SERVING_ID);
  const [quantity, setQuantity] = useState('1');
  const [servingPickerExpanded, setServingPickerExpanded] = useState(false);

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    const macros: MacroTargets = {
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    };

    const serving = SERVING_OPTIONS.find((option) => option.id === selectedServingId);
    const servingSize = serving?.value ?? 0;
    const servingUnit = serving?.unit ?? 'g';

    if (servingSize <= 0) {
      Alert.alert('Error', 'Please enter a valid serving size');
      return;
    }

    const foodItem: FoodItem = {
      id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: foodName.trim(),
      macros,
      servingSize,
      servingUnit,
    };

    try {
      // Save food to database
      await saveFood(foodItem);
      
      // Add to today's log
      const qty = parseFloat(quantity) || 1;
      await addFoodToToday(foodItem, qty);

      Alert.alert('Success', `Added ${foodItem.name} to today's log`);
      // Keep form values (last recorded save) — no reset
    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert('Error', 'Failed to save food. Please try again.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={!servingPickerExpanded}
    >
      <Text style={styles.title}>Add Food</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Food Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Chicken Breast"
          value={foodName}
          onChangeText={setFoodName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros (per serving)</Text>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serving Size</Text>
        <ServingSizePicker
          options={SERVING_OPTIONS}
          selectedId={selectedServingId}
          onSelect={setSelectedServingId}
          onExpandedChange={setServingPickerExpanded}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Quantity (servings)</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Food</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  macroRow: {
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
