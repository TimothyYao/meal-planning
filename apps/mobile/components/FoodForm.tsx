import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
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
} from '../storage';
import { ServingOption, ServingSizePicker } from './ServingSizePicker';
import { MacroAmountPicker } from './MacroAmountPicker';
import { NumberEditor } from './NumberEditor';
import CalendarPicker from './CalendarPicker';

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
  initialDate?: Date;
  onSave: (food: FoodItem, quantity: number, date?: Date) => Promise<void>;
  showQuantity?: boolean;
  showDate?: boolean;
  buttonText?: string;
  onValidationError?: (message: string) => void;
  hideSaveButton?: boolean;
  noPadding?: boolean;
}

export interface FoodFormRef {
  save: () => Promise<void>;
  isSaving: () => boolean;
}

const FoodForm = forwardRef<FoodFormRef, FoodFormProps>(({
  initialFood,
  initialQuantity = '1',
  initialDate,
  onSave,
  showQuantity = true,
  showDate = false,
  buttonText = 'Save Food',
  onValidationError,
  hideSaveButton = false,
  noPadding = false,
}, ref) => {
  const [foodName, setFoodName] = useState(initialFood?.name || '');
  const [protein, setProtein] = useState(initialFood?.macros.protein.toString() || '');
  const [carbs, setCarbs] = useState(initialFood?.macros.carbs.toString() || '');
  const [fat, setFat] = useState(initialFood?.macros.fat.toString() || '');
  const [selectedServingId, setSelectedServingId] = useState(() => {
    if (initialFood) {
      // Normalize values for comparison - trim whitespace and ensure consistent types
      const foodSize = Number(initialFood.servingSize);
      const foodUnit = String(initialFood.servingUnit).trim().toLowerCase();
      
      // Match by comparing both value and unit, ensuring type consistency
      const option = SERVING_OPTIONS.find(
        opt => Number(opt.value) === foodSize && 
               String(opt.unit).trim().toLowerCase() === foodUnit
      );
      if (option) {
        return option.id;
      }
      // If no match found, default to standard serving size
      return DEFAULT_SERVING_ID;
    }
    return DEFAULT_SERVING_ID;
  });
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [servingPickerExpanded, setServingPickerExpanded] = useState(false);
  const [showProteinPicker, setShowProteinPicker] = useState(false);
  const [showCarbsPicker, setShowCarbsPicker] = useState(false);
  const [showFatPicker, setShowFatPicker] = useState(false);
  const [showQuantityEditor, setShowQuantityEditor] = useState(false);
  const [tempProteinValue, setTempProteinValue] = useState(0);
  const [tempCarbsValue, setTempCarbsValue] = useState(0);
  const [tempFatValue, setTempFatValue] = useState(0);
  const [lastSavedProtein, setLastSavedProtein] = useState<number | null>(null);
  const [lastSavedCarbs, setLastSavedCarbs] = useState<number | null>(null);
  const [lastSavedFat, setLastSavedFat] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLastValues();
  }, []);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving: () => isSaving,
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
    if (isSaving) {
      return; // Prevent multiple saves
    }

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

    // Check if calories is 0 and ask for confirmation
    if (calculatedCalories === 0) {
      const shouldProceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Zero Calories',
          'This food has 0 calories. Are you sure you want to save it?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Save',
              onPress: () => resolve(true),
            },
          ]
        );
      });

      if (!shouldProceed) {
        return;
      }
    }

    setIsSaving(true);
    try {
      await proceedWithSave(macros);
    } finally {
      setIsSaving(false);
    }
  };

  const proceedWithSave = async (macros: MacroTargets) => {
    const serving = SERVING_OPTIONS.find((option) => option.id === selectedServingId);
    if (!serving) {
      console.error('Selected serving ID not found:', selectedServingId);
      if (onValidationError) {
        onValidationError('Invalid serving size selected');
      }
      return;
    }
    
    const servingSize = serving.value;
    const servingUnit = serving.unit;

    const foodItem: FoodItem = {
      id: initialFood?.id || await generateFoodId(),
      name: foodName.trim(),
      macros,
      servingSize,
      servingUnit,
    };

    const qty = parseFloat(quantity) || 1;
    const dateToUse = showDate ? selectedDate : undefined;
    await onSave(foodItem, qty, dateToUse);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={noPadding ? styles.contentNoPadding : styles.content}
      scrollEnabled={!servingPickerExpanded}
    >
      {showDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity
            onPress={() => setCalendarVisible(true)}
            style={styles.dateButton}
          >
            <Text style={styles.dateButtonText}>
              {isToday(selectedDate)
                ? 'Today'
                : selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        {showQuantity ? (
          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Serving Size</Text>
              <ServingSizePicker
                options={SERVING_OPTIONS}
                selectedId={selectedServingId}
                onSelect={setSelectedServingId}
                onExpandedChange={setServingPickerExpanded}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Number of Servings</Text>
              <TouchableOpacity
                style={styles.inputButton}
                onPress={() => setShowQuantityEditor(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.input, styles.inputButtonText]}>
                  {parseFloat(quantity) || 1}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.columnLabel}>Serving Size</Text>
            <ServingSizePicker
              options={SERVING_OPTIONS}
              selectedId={selectedServingId}
              onSelect={setSelectedServingId}
              onExpandedChange={setServingPickerExpanded}
            />
          </View>
        )}
      </View>

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
          <Text style={styles.macroLabel}>Calories (auto)</Text>
          <Text style={styles.caloriesValue}>{caloriesText}</Text>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Protein (g)</Text>
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
          <Text style={styles.macroLabel}>Carbs (g)</Text>
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
          <Text style={styles.macroLabel}>Fat (g)</Text>
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

      {!hideSaveButton && (
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : buttonText}
          </Text>
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

      {/* Quantity Editor Modal */}
      <NumberEditor
        visible={showQuantityEditor}
        value={parseFloat(quantity) || 1}
        onSave={(value) => {
          setQuantity(value.toString());
          setShowQuantityEditor(false);
        }}
        onCancel={() => setShowQuantityEditor(false)}
        min={0.1}
        max={999}
        title="Number of Servings"
        unit="servings"
        keyboardType="decimal-pad"
        hideRange={true}
      />

      {showDate && (
        <CalendarPicker
          visible={calendarVisible}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onClose={() => setCalendarVisible(false)}
        />
      )}
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
  contentNoPadding: {
    padding: 0,
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
    minWidth: 100,
  },
  inputButtonText: {
    flex: 1,
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  caloriesValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    minWidth: 100,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
});

export default FoodForm;
