import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, MacroTargets } from '@meal-planning/shared';
import { 
  getLastProtein, 
  saveLastProtein,
  getLastCarbs,
  saveLastCarbs,
  getLastFat,
  saveLastFat,
  generateFoodId,
} from '../utils/storage';
import { ServingOption, ServingSizePicker } from './ServingSizePicker';
import { MacroAmountPicker } from './MacroAmountPicker';

export const SERVING_OPTIONS: ServingOption[] = [
  { id: '1ml', value: 1, unit: 'ml', label: '1 ml' },
  { id: '1tsp', value: 5, unit: 'ml', label: '1 tsp (5 ml)' },
  { id: '1tbsp', value: 15, unit: 'ml', label: '1 tbsp (15 ml)' },
  { id: '100ml', value: 100, unit: 'ml', label: '100 ml' },
  { id: '1serving', value: 1, unit: 'serving', label: '1 serving' },
  { id: '1cup', value: 240, unit: 'ml', label: '1 cup (240 ml)' },
  { id: '1g', value: 1, unit: 'g', label: '1 g' },
  { id: '100g', value: 100, unit: 'g', label: '100 g' },
];

const DEFAULT_SERVING_ID = '100g';

interface FoodFormProps {
  initialFood?: FoodItem;
  initialQuantity?: string;
  onSave: (food: FoodItem, quantity: number) => Promise<void>;
  showQuantity?: boolean;
  buttonText?: string;
  onValidationError?: (message: string) => void;
  hideSaveButton?: boolean;
}

export interface FoodFormRef {
  save: () => Promise<void>;
}

const FoodForm = forwardRef<FoodFormRef, FoodFormProps>(({
  initialFood,
  initialQuantity = '1',
  onSave,
  showQuantity = true,
  buttonText = 'Save Food',
  onValidationError,
  hideSaveButton = false,
}, ref) => {
  const [foodName, setFoodName] = useState(initialFood?.name || '');
  const [protein, setProtein] = useState(initialFood?.macros.protein.toString() || '');
  const [carbs, setCarbs] = useState(initialFood?.macros.carbs.toString() || '');
  const [fat, setFat] = useState(initialFood?.macros.fat.toString() || '');
  const [selectedServingId, setSelectedServingId] = useState(() => {
    if (initialFood) {
      const option = SERVING_OPTIONS.find(
        opt => opt.value === initialFood.servingSize && opt.unit === initialFood.servingUnit
      );
      return option?.id || DEFAULT_SERVING_ID;
    }
    return DEFAULT_SERVING_ID;
  });
  const [quantity, setQuantity] = useState(initialQuantity);
  const [servingPickerExpanded, setServingPickerExpanded] = useState(false);
  const [showProteinPicker, setShowProteinPicker] = useState(false);
  const [showCarbsPicker, setShowCarbsPicker] = useState(false);
  const [showFatPicker, setShowFatPicker] = useState(false);
  const [tempProteinValue, setTempProteinValue] = useState(0);
  const [tempCarbsValue, setTempCarbsValue] = useState(0);
  const [tempFatValue, setTempFatValue] = useState(0);
  const [lastSavedProtein, setLastSavedProtein] = useState<number | null>(null);
  const [lastSavedCarbs, setLastSavedCarbs] = useState<number | null>(null);
  const [lastSavedFat, setLastSavedFat] = useState<number | null>(null);

  useEffect(() => {
    loadLastValues();
  }, []);

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const loadLastValues = async () => {
    const [lastProtein, lastCarbs, lastFat] = await Promise.all([
      getLastProtein(),
      getLastCarbs(),
      getLastFat(),
    ]);
    setLastSavedProtein(lastProtein);
    setLastSavedCarbs(lastCarbs);
    setLastSavedFat(lastFat);
  };

  const loadLastProtein = async () => {
    const lastProtein = await getLastProtein();
    setLastSavedProtein(lastProtein);
  };

  const loadLastCarbs = async () => {
    const lastCarbs = await getLastCarbs();
    setLastSavedCarbs(lastCarbs);
  };

  const loadLastFat = async () => {
    const lastFat = await getLastFat();
    setLastSavedFat(lastFat);
  };

  const calculateCaloriesFromMacros = (proteinValue: number, carbsValue: number, fatValue: number) => {
    return proteinValue * 4 + carbsValue * 4 + fatValue * 9;
  };

  const proteinValue = parseFloat(protein) || 0;
  const carbsValue = parseFloat(carbs) || 0;
  const fatValue = parseFloat(fat) || 0;
  const calculatedCalories = calculateCaloriesFromMacros(proteinValue, carbsValue, fatValue);
  const caloriesText = Number.isFinite(calculatedCalories)
    ? `${Math.round(calculatedCalories)}`
    : '0';

  const handleSave = async () => {
    if (!foodName.trim()) {
      if (onValidationError) {
        onValidationError('Please enter a food name');
      }
      return;
    }

    const macros: MacroTargets = {
      calories: calculatedCalories,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
    };

    const serving = SERVING_OPTIONS.find((option) => option.id === selectedServingId);
    const servingSize = serving?.value ?? 0;
    const servingUnit = serving?.unit ?? 'g';

    if (servingSize <= 0) {
      if (onValidationError) {
        onValidationError('Please enter a valid serving size');
      }
      return;
    }

    const foodItem: FoodItem = {
      id: initialFood?.id || await generateFoodId(),
      name: foodName.trim(),
      macros,
      servingSize,
      servingUnit,
    };

    const qty = parseFloat(quantity) || 1;
    await onSave(foodItem, qty);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={!servingPickerExpanded}
    >
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
          <Text style={styles.label}>Calories (auto)</Text>
          <TextInput
            style={styles.input}
            value={caloriesText}
            keyboardType="numeric"
            editable={false}
          />
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Protein (g)</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={async () => {
              const currentValue = parseFloat(protein) || 0;
              setTempProteinValue(currentValue);
              await loadLastProtein();
              setShowProteinPicker(true);
            }}
          >
            <Text style={[styles.input, styles.inputButtonText]}>
              {protein || '0'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={async () => {
              const currentValue = parseFloat(carbs) || 0;
              setTempCarbsValue(currentValue);
              await loadLastCarbs();
              setShowCarbsPicker(true);
            }}
          >
            <Text style={[styles.input, styles.inputButtonText]}>
              {carbs || '0'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.label}>Fat (g)</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={async () => {
              const currentValue = parseFloat(fat) || 0;
              setTempFatValue(currentValue);
              await loadLastFat();
              setShowFatPicker(true);
            }}
          >
            <Text style={[styles.input, styles.inputButtonText]}>
              {fat || '0'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
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

      {showQuantity && (
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
      )}

      {!hideSaveButton && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}

      {/* Protein Picker Modal */}
      <Modal
        visible={showProteinPicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowProteinPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowProteinPicker(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Protein</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <MacroAmountPicker
              value={tempProteinValue}
              onChange={setTempProteinValue}
              min={0}
              max={1000}
              sliderMax={100}
              step={1}
              label="Protein (g)"
              lastSavedValue={lastSavedProtein}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowProteinPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={async () => {
                setProtein(tempProteinValue.toString());
                await saveLastProtein(tempProteinValue);
                await loadLastProtein();
                setShowProteinPicker(false);
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Carbs Picker Modal */}
      <Modal
        visible={showCarbsPicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCarbsPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCarbsPicker(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Carbs</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <MacroAmountPicker
              value={tempCarbsValue}
              onChange={setTempCarbsValue}
              min={0}
              max={1000}
              sliderMax={200}
              step={1}
              label="Carbs (g)"
              lastSavedValue={lastSavedCarbs}
              quickValues={[10, 20, 40, 80]}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCarbsPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={async () => {
                setCarbs(tempCarbsValue.toString());
                await saveLastCarbs(tempCarbsValue);
                await loadLastCarbs();
                setShowCarbsPicker(false);
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fat Picker Modal */}
      <Modal
        visible={showFatPicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFatPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowFatPicker(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Fat</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <View style={styles.modalContent}>
            <MacroAmountPicker
              value={tempFatValue}
              onChange={setTempFatValue}
              min={0}
              max={1000}
              sliderMax={100}
              step={1}
              label="Fat (g)"
              lastSavedValue={lastSavedFat}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFatPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={async () => {
                setFat(tempFatValue.toString());
                await saveLastFat(tempFatValue);
                await loadLastFat();
                setShowFatPicker(false);
              }}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
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
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  inputButtonText: {
    flex: 1,
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalHeaderSpacer: {
    width: 44,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalDoneButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FoodForm;
