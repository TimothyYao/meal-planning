import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';

export type NumberEditorProps = {
  visible: boolean;
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
  min?: number;
  max?: number;
  title?: string;
  unit?: string;
  placeholder?: string;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'numeric' | 'default';
  hideRange?: boolean;
};

export function NumberEditor({
  visible,
  value,
  onSave,
  onCancel,
  min = 0,
  max = 9999,
  title = 'Enter Value',
  unit,
  placeholder,
  keyboardType,
  hideRange = false,
}: NumberEditorProps) {
  const [editValue, setEditValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditValue('');
      setIsFocused(false);
    }
  }, [visible]);

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || editValue.trim() === '') {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      return;
    }
    const clampedValue = Math.max(min, Math.min(max, numValue));
    onSave(clampedValue);
    onCancel();
  };

  const displayPlaceholder = placeholder ?? (hideRange ? '' : `${min} - ${max}`);
  // When focused and empty, use a space character to help center the cursor
  // This is a workaround for React Native's cursor positioning bug with centered text
  const showPlaceholder = !isFocused || editValue.length > 0;
  const placeholderValue = showPlaceholder ? displayPlaceholder : ' '; // Space character for centering

  const titleWithRange = hideRange ? title : `${title} (${min} - ${max})`;
  
  // Determine keyboard type - use 'numeric' if not specified to enable Done button
  // 'numeric' supports decimals and has a Done button on iOS
  const effectiveKeyboardType = keyboardType || 'numeric';
  
  // Only show return key on keyboards that support it
  const supportsReturnKey = effectiveKeyboardType !== 'decimal-pad' && effectiveKeyboardType !== 'number-pad';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{titleWithRange}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.editInput, unit != null && styles.editInputWithUnit]}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType={effectiveKeyboardType}
              returnKeyType={supportsReturnKey ? "done" : undefined}
              onSubmitEditing={supportsReturnKey ? handleSave : undefined}
              blurOnSubmit={supportsReturnKey}
              placeholder={placeholderValue}
              placeholderTextColor={showPlaceholder ? "#999" : "transparent"}
              autoFocus
              textAlign="center"
              numberOfLines={1}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {unit != null && (
              <View style={styles.unitBadge} pointerEvents="none">
                <Text style={styles.unitText}>{unit}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  inputWrapper: {
    position: 'relative',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    minHeight: 56,
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'center',
      includeFontPadding: false,
    }),
    ...(Platform.OS === 'ios' && {
      textAlign: 'center',
    }),
  },
  editInputWithUnit: {
    paddingRight: 40,
  },
  unitBadge: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
});
