import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CountryItem } from '../utils/countryCodes';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '../utils/countryCodes';

type CountryCodePickerProps = {
  value: CountryItem;
  onSelect: (country: CountryItem) => void;
  disabled?: boolean;
};

export function CountryCodePicker({ value, onSelect, disabled }: CountryCodePickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerDial}>{value.dial}</Text>
        <Ionicons name="chevron-down" size={18} color="#8E8E93" />
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.overlayTouchable]}
            onPress={() => setVisible(false)}
          />
          <View style={styles.modalContent} pointerEvents="box-none">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Country code</Text>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={12}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              initialNumToRender={20}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.code === value.code && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionDial}>{item.dial}</Text>
                  <Text style={styles.optionLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.code === value.code && (
                    <Ionicons name="checkmark" size={22} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6C6C8',
    backgroundColor: '#fff',
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerDial: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalDone: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  list: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  optionDial: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
    width: 48,
  },
  optionLabel: {
    flex: 1,
    fontSize: 17,
    color: '#000',
  },
});
