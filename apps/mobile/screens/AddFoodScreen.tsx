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

export default function AddFoodScreen() {
  const [foodName, setFoodName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [servingUnit, setServingUnit] = useState('g');

  const handleSave = () => {
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

    const foodItem: Omit<FoodItem, 'id'> = {
      name: foodName.trim(),
      brand: brand.trim() || undefined,
      macros,
      servingSize: parseFloat(servingSize) || 100,
      servingUnit: servingUnit || 'g',
    };

    // TODO: Save to storage/backend
    console.log('Food item to save:', foodItem);

    Alert.alert('Success', `Added ${foodItem.name} to database`);

    // Reset form
    setFoodName('');
    setBrand('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setServingSize('');
    setServingUnit('g');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <Text style={styles.label}>Brand (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Generic"
          value={brand}
          onChangeText={setBrand}
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

        <View style={styles.servingRow}>
          <TextInput
            style={[styles.input, styles.servingInput, { marginRight: 12 }]}
            placeholder="100"
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.unitInput]}
            placeholder="g"
            value={servingUnit}
            onChangeText={setServingUnit}
          />
        </View>
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
  servingRow: {
    flexDirection: 'row',
  },
  servingInput: {
    flex: 2,
  },
  unitInput: {
    flex: 1,
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
