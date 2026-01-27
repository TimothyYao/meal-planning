import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, MacroTargets, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import {
  saveLastProtein,
  saveLastCarbs,
  saveLastFat,
  getLastDate,
  saveLastDate,
  generateFoodId,
} from '../storage';
import { ServingOption, ServingSizePicker } from './ServingSizePicker';
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
  const [showQuantityEditor, setShowQuantityEditor] = useState(false);
  const [showProteinEditor, setShowProteinEditor] = useState(false);
  const [showCarbsEditor, setShowCarbsEditor] = useState(false);
  const [showFatEditor, setShowFatEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const nameInputRef = useRef<TextInput>(null);
  const proteinInputRef = useRef<TextInput>(null);
  const carbsInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);

  const handleArrowNavigation = (
    key: string,
    previousRef?: { current: TextInput | null },
    nextRef?: { current: TextInput | null }
  ) => {
    if (!key) {
      return;
    }
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === 'arrowup' || normalizedKey === 'up') {
      previousRef?.current?.focus();
      return;
    }
    if (normalizedKey === 'arrowdown' || normalizedKey === 'down') {
      nextRef?.current?.focus();
    }
  };

  useEffect(() => {
    if (!initialDate && showDate) {
      loadLastDate();
    }
  }, []);

  useImperativeHandle(ref, () => ({
    save: handleSave,
    isSaving: () => isSaving,
  }));

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
    await Promise.all([
      saveLastProtein(proteinValue),
      saveLastCarbs(carbsValue),
      saveLastFat(fatValue),
    ]);
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
          ref={nameInputRef}
          style={styles.input}
          placeholder="e.g., Chicken Breast"
          value={foodName}
          onChangeText={setFoodName}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => proteinInputRef.current?.focus()}
          onKeyPress={({ nativeEvent }) =>
            handleArrowNavigation(nativeEvent.key, undefined, proteinInputRef)
          }
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
            <TextInput
              ref={proteinInputRef}
              style={[styles.input, styles.macroInput]}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => carbsInputRef.current?.focus()}
              onKeyPress={({ nativeEvent }) =>
                handleArrowNavigation(nativeEvent.key, nameInputRef, carbsInputRef)
              }
            />
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => setShowProteinEditor(true)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Carbs (g)</Text>
          <View style={styles.macroInputContainer}>
            <TextInput
              ref={carbsInputRef}
              style={[styles.input, styles.macroInput]}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="0"
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => fatInputRef.current?.focus()}
              onKeyPress={({ nativeEvent }) =>
                handleArrowNavigation(nativeEvent.key, proteinInputRef, fatInputRef)
              }
            />
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => setShowCarbsEditor(true)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Fat (g)</Text>
          <View style={styles.macroInputContainer}>
            <TextInput
              ref={fatInputRef}
              style={[styles.input, styles.macroInput]}
              value={fat}
              onChangeText={setFat}
              placeholder="0"
              keyboardType="numeric"
              returnKeyType="done"
              onKeyPress={({ nativeEvent }) =>
                handleArrowNavigation(nativeEvent.key, carbsInputRef, undefined)
              }
            />
            <TouchableOpacity
              style={styles.penIconButton}
              onPress={() => setShowFatEditor(true)}
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

      <NumberEditor
        visible={showProteinEditor}
        value={parseFloat(protein) || 0}
        onSave={async (value) => {
          setProtein(value.toString());
          await saveLastProtein(value);
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

      <NumberEditor
        visible={showCarbsEditor}
        value={parseFloat(carbs) || 0}
        onSave={async (value) => {
          setCarbs(value.toString());
          await saveLastCarbs(value);
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

      <NumberEditor
        visible={showFatEditor}
        value={parseFloat(fat) || 0}
        onSave={async (value) => {
          setFat(value.toString());
          await saveLastFat(value);
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
    flexShrink: 0,
  },
  macroInput: {
    minWidth: 100,
    textAlign: 'right',
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
