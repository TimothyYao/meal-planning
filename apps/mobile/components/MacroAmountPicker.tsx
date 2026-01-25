import { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MacroAmountPickerProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  sliderMax?: number; // Max value for slider (defaults to max if not provided)
  step?: number;
  label?: string;
  lastSavedValue?: number | null;
  quickValues?: number[]; // Custom quick select values (defaults to [5, 10, 20, 40])
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 80;
const SLIDER_HEIGHT = 60;
const THUMB_SIZE = 48;

export function MacroAmountPicker({
  value,
  onChange,
  min = 1,
  max = 150,
  sliderMax,
  step = 1,
  label,
  lastSavedValue,
  quickValues,
}: MacroAmountPickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editValue, setEditValue] = useState('');
  const sliderContainerRef = useRef<View>(null);
  const sliderTrackRef = useRef<View>(null);
  const sliderLayout = useRef({ x: 0, width: 0 });
  const startValue = useRef(value);
  
  // Force integer step for slider and buttons
  const sliderStep = 1;
  // Use sliderMax for slider, or max if not provided
  const effectiveSliderMax = sliderMax ?? max;
  // Clamp value to slider max for slider calculations
  const sliderValue = Math.min(Math.round(value), effectiveSliderMax);

  // Convert value to position (0 to SLIDER_WIDTH) - uses slider max
  const valueToPosition = (val: number) => {
    const clampedVal = Math.min(val, effectiveSliderMax);
    const normalized = (clampedVal - min) / (effectiveSliderMax - min);
    return normalized * SLIDER_WIDTH;
  };

  // Convert screen position to value (always integer for slider, limited to sliderMax)
  const screenPositionToValue = (pageX: number) => {
    const { x, width } = sliderLayout.current;
    if (width === 0) return sliderValue; // Not measured yet
    
    const relativeX = pageX - x;
    const clampedPosition = Math.max(0, Math.min(width, relativeX));
    const normalized = clampedPosition / width;
    const rawValue = min + normalized * (effectiveSliderMax - min);
    const steppedValue = Math.round(rawValue / sliderStep) * sliderStep;
    return Math.max(min, Math.min(effectiveSliderMax, steppedValue));
  };

  const measureSlider = () => {
    sliderTrackRef.current?.measureInWindow((x, y, width, height) => {
      sliderLayout.current = { x, width };
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        measureSlider();
        setIsDragging(true);
        startValue.current = sliderValue;
        const { pageX } = evt.nativeEvent;
        const newValue = screenPositionToValue(pageX);
        onChange(newValue);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { pageX } = evt.nativeEvent;
        const newValue = screenPositionToValue(pageX);
        onChange(newValue);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const thumbPosition = valueToPosition(sliderValue);

  const handleIncrement = () => {
    const newValue = Math.min(effectiveSliderMax, sliderValue + sliderStep);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, sliderValue - sliderStep);
    onChange(newValue);
  };

  const handleEditPress = () => {
    setEditValue(value.toString());
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      return;
    }
    const clampedValue = Math.max(min, Math.min(max, numValue));
    // Preserve decimal value from precise input
    onChange(clampedValue);
    setShowEditModal(false);
  };

  // Format display value: show integer unless it has decimals
  const formatDisplayValue = (val: number) => {
    // Check if value has decimal places
    if (val % 1 === 0) {
      return Math.round(val).toString();
    }
    // Show up to 1 decimal place if it exists
    return val.toFixed(1);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditValue('');
  };

  // Quick select buttons for common values
  // Use custom quickValues if provided, otherwise default to [5, 10, 20, 40]
  const getQuickValues = () => {
    const baseValues = quickValues || [5, 10, 20, 40];
    return baseValues.filter(v => v >= min && v <= max);
  };
  const defaultQuickValues = getQuickValues();
  
  // Check if last saved value should be shown (separate, on the right)
  const shouldShowLastSaved = lastSavedValue !== null && 
      lastSavedValue !== undefined && 
      lastSavedValue >= min && 
      lastSavedValue <= max &&
      !defaultQuickValues.includes(lastSavedValue);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {/* Large value display */}
      <View style={styles.valueDisplay}>
        <View style={styles.valueDisplayRow}>
          <Text style={styles.valueText}>
            {formatDisplayValue(value)}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditPress}
          >
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.unitText}>g</Text>
      </View>

      {/* Increment/Decrement buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, value <= min && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={value <= min}
        >
          <Text style={[styles.buttonLabel, value <= min && styles.buttonLabelDisabled]}>
            -1
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, value >= effectiveSliderMax && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={value >= effectiveSliderMax}
        >
          <Text style={[styles.buttonLabel, value >= effectiveSliderMax && styles.buttonLabelDisabled]}>
            +1
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick select buttons */}
      {(defaultQuickValues.length > 0 || shouldShowLastSaved) && (
        <View style={styles.quickSelectRow}>
          {/* Standard quick values */}
          {defaultQuickValues.map((quickValue) => (
            <TouchableOpacity
              key={quickValue}
              style={[
                styles.quickSelectButton,
                value === quickValue && styles.quickSelectButtonActive,
              ]}
              onPress={() => onChange(quickValue)}
            >
              <Text
                style={[
                  styles.quickSelectText,
                  value === quickValue && styles.quickSelectTextActive,
                ]}
              >
                {formatDisplayValue(quickValue)}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Last saved value on the right */}
          {shouldShowLastSaved && (
            <TouchableOpacity
              style={[
                styles.quickSelectButton,
                value === lastSavedValue && styles.quickSelectButtonActive,
                styles.quickSelectButtonLastSaved,
              ]}
              onPress={() => onChange(lastSavedValue!)}
            >
              <View style={styles.quickSelectContent}>
                <Text
                  style={[
                    styles.quickSelectText,
                    value === lastSavedValue && styles.quickSelectTextActive,
                  ]}
                >
                  {formatDisplayValue(lastSavedValue!)}
                </Text>
                <Ionicons 
                  name="time-outline" 
                  size={12} 
                  color={value === lastSavedValue ? '#fff' : '#999'} 
                  style={styles.lastSavedIcon} 
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Slider */}
      <View 
        style={styles.sliderContainer} 
        ref={sliderContainerRef}
        {...panResponder.panHandlers}
      >
        <View 
          style={styles.sliderTrack}
          ref={sliderTrackRef}
          onLayout={measureSlider}
        >
          <View
            style={[
              styles.sliderFill,
              {
                width: thumbPosition,
              },
            ]}
          />
          <View
            style={[
              styles.sliderThumb,
              {
                left: thumbPosition - THUMB_SIZE / 2,
              },
            ]}
          >
            {isDragging && (
              <View style={styles.thumbValueBubble}>
                <Text style={styles.thumbValueText}>
                  {formatDisplayValue(value)}
                </Text>
              </View>
            )}
          </View>
        </View>
        {/* Min/Max labels */}
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{min}</Text>
          <Text style={styles.sliderLabel}>{effectiveSliderMax}</Text>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={handleEditCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Value</Text>
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              placeholder={`${min} - ${max}`}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleEditCancel}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleEditSave}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 0,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  valueDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  unitText: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    marginBottom: 0,
    marginTop: 64,
    paddingVertical: 20,
    marginVertical: -20,
  },
  sliderTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#007AFF',
    borderWidth: 4,
    borderColor: '#fff',
    top: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbValueBubble: {
    position: 'absolute',
    bottom: THUMB_SIZE + 8,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  thumbValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 40,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  buttonLabelDisabled: {
    color: '#ccc',
  },
  quickSelectRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  quickSelectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickSelectButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickSelectButtonLastSaved: {
    borderColor: '#007AFF',
    borderWidth: 1.5,
  },
  quickSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickSelectText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  quickSelectTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  lastSavedIcon: {
    marginLeft: 4,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  editInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonSave: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
