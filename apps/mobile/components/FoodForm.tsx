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
import { FoodItem, MacroTargets, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { 
  getLastProtein, 
  saveLastProtein,
  getLastCarbs,
  saveLastCarbs,
  getLastFat,
  saveLastFat,
  getLastDate,
  saveLastDate,
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

const DEFAULT_SERVING_ID = '1serving';

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
  const [isLoadingLastDate, setIsLoadingLastDate] = useState(!initialDate && showDate);
  const [servingPickerExpanded, setServingPickerExpanded] = useState(false);
  const [showProteinPicker, setShowProteinPicker] = useState(false);
  const [showCarbsPicker, setShowCarbsPicker] = useState(false);
  const [showFatPicker, setShowFatPicker] = useState(false);
  const [showQuantityEditor, setShowQuantityEditor] = useState(false);
  const [showProteinEditor, setShowProteinEditor] = useState(false);
  const [showCarbsEditor, setShowCarbsEditor] = useState(false);
  const [showFatEditor, setShowFatEditor] = useState(false);
  const [tempProteinValue, setTempProteinValue] = useState(0);
  const [tempCarbsValue, setTempCarbsValue] = useState(0);
  const [tempFatValue, setTempFatValue] = useState(0);
  const [lastSavedProtein, setLastSavedProtein] = useState<number | null>(null);
  const [lastSavedCarbs, setLastSavedCarbs] = useState<number | null>(null);
  const [lastSavedFat, setLastSavedFat] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLastValues();
    if (!initialDate && showDate) {
      loadLastDate();
    }
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

  const loadLastDate = async () => {
    try {
      const lastDate = await getLastDate();
      if (lastDate) {
        setSelectedDate(lastDate);
      }
    } catch (error) {
      console.error('Error loading last date:', error);
    } finally {
      setIsLoadingLastDate(false);
    }
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
    
    // Save the date as the last used date if showDate is true
    if (showDate && selectedDate) {
      await saveLastDate(selectedDate);
    }
    
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
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
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
                <Ionicons name="chevron-forward" size={20} color={fontColor.quaternary} />
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
          <View style={styles.macroInputContainer}>
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
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => {
                setShowProteinEditor(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Carbs (g)</Text>
          <View style={styles.macroInputContainer}>
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
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => {
                setShowCarbsEditor(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Fat (g)</Text>
          <View style={styles.macroInputContainer}>
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
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => {
                setShowFatEditor(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
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
              <Ionicons name="close" size={28} color={fontColor.secondary} />
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
              <Ionicons name="close" size={28} color={fontColor.secondary} />
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
              <Ionicons name="close" size={28} color={fontColor.secondary} />
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
        keyboardType="numeric"
        hideRange={true}
      />

      {/* Protein Editor Modal */}
      <NumberEditor
        visible={showProteinEditor}
        value={parseFloat(protein) || 0}
        onSave={async (value) => {
          setProtein(value.toString());
          await saveLastProtein(value);
          await loadLastProtein();
          setShowProteinEditor(false);
        }}
        onCancel={() => setShowProteinEditor(false)}
        min={0}
        max={1000}
        title="Protein"
        unit="g"
        keyboardType="numeric"
        hideRange={true}
      />

      {/* Carbs Editor Modal */}
      <NumberEditor
        visible={showCarbsEditor}
        value={parseFloat(carbs) || 0}
        onSave={async (value) => {
          setCarbs(value.toString());
          await saveLastCarbs(value);
          await loadLastCarbs();
          setShowCarbsEditor(false);
        }}
        onCancel={() => setShowCarbsEditor(false)}
        min={0}
        max={1000}
        title="Carbs"
        unit="g"
        keyboardType="numeric"
        hideRange={true}
      />

      {/* Fat Editor Modal */}
      <NumberEditor
        visible={showFatEditor}
        value={parseFloat(fat) || 0}
        onSave={async (value) => {
          setFat(value.toString());
          await saveLastFat(value);
          await loadLastFat();
          setShowFatEditor(false);
        }}
        onCancel={() => setShowFatEditor(false)}
        min={0}
        max={1000}
        title="Fat"
        unit="g"
        keyboardType="numeric"
        hideRange={true}
      />

      {showDate && (
        <CalendarPicker
          visible={calendarVisible}
          selectedDate={selectedDate}
          onDateSelect={async (date) => {
            setSelectedDate(date);
            await saveLastDate(date);
          }}
          onClose={() => setCalendarVisible(false)}
        />
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.xl,
  },
  contentNoPadding: {
    padding: 0,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: colors.background.secondary,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
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
    marginBottom: spacing.md,
  },
  macroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  penIconButton: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    flex: 1,
  },
  caloriesValue: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.secondary,
    textAlign: 'right',
    minWidth: 100,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: fontColor.inverse,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: fontColor.secondary,
  },
  modalHeaderSpacer: {
    width: 44,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    paddingTop: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  modalCancelText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.tertiary,
  },
  modalDoneButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.inverse,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.secondary,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  dateButtonText: {
    fontSize: fontSize.base,
    color: fontColor.primary,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: spacing.sm,
  },
});

export default FoodForm;
