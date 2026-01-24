import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type ServingOption = { id: string; value: number; unit: string; label: string };

type ServingSizePickerProps = {
  options: ServingOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onExpandedChange: (expanded: boolean) => void;
};

export function ServingSizePicker({
  options,
  selectedId,
  onSelect,
  onExpandedChange,
}: ServingSizePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const chipRefs = useRef<Record<string, View | null>>({});
  const chipLayouts = useRef<Record<string, { x: number; y: number; w: number; h: number }>>(
    {}
  );
  const selectionLock = useRef(false);

  const selectedOption = options.find((option) => option.id === selectedId);
  const selectedLabel = selectedOption?.label ?? 'Select';

  const closePicker = () => {
    setIsExpanded(false);
    onExpandedChange(false);
    setHoveredId(null);
    chipLayouts.current = {};
    selectionLock.current = false;
  };

  const handleSelect = (id: string) => {
    if (selectionLock.current) {
      return;
    }
    selectionLock.current = true;
    onSelect(id);
    closePicker();
    requestAnimationFrame(() => {
      selectionLock.current = false;
    });
  };

  useEffect(() => {
    if (!isExpanded) {
      chipLayouts.current = {};
    }
  }, [isExpanded]);

  const getHoveredId = (x: number, y: number) => {
    const entries = Object.entries(chipLayouts.current);
    for (const [id, rect] of entries) {
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return id;
      }
    }
    return null;
  };

  const measureChip = (id: string) => {
    const node = chipRefs.current[id];
    if (!node || !node.measureInWindow) {
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      chipLayouts.current[id] = { x, y, w, h };
    });
  };

  const handleTouchAt = (x: number, y: number) => {
    const id = getHoveredId(x, y);
    setHoveredId(id);
    return id;
  };

  return (
    <View>
      <Pressable
        style={[styles.selectedChipButton, styles.chipSelected]}
        onPressIn={() => {
          setIsExpanded(true);
          onExpandedChange(true);
          setHoveredId(null);
        }}
      >
        <Text style={[styles.chipText, styles.chipTextSelected]}>{selectedLabel}</Text>
      </Pressable>

      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalOverlay} onPress={closePicker}>
          <Pressable
            style={styles.modalSheet}
            onPress={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              handleTouchAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
            }}
            onTouchMove={(event) => {
              handleTouchAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
            }}
            onTouchEnd={(event) => {
              const id = handleTouchAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
              if (id) {
                handleSelect(id);
              } else {
                closePicker();
              }
            }}
            onTouchCancel={closePicker}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Serving Size</Text>
              <TouchableOpacity onPress={closePicker}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.chipGrid, styles.chipGridExpanded]}>
              {options.map((option) => {
                const isSelected = selectedId === option.id;
                const isHovered = hoveredId === option.id;
                return (
                  <View
                    key={option.id}
                    ref={(node) => {
                      chipRefs.current[option.id] = node;
                    }}
                    style={styles.chipWrapper}
                    onLayout={() => measureChip(option.id)}
                  >
                    <View
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                        isHovered && styles.chipHovered,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          (isSelected || isHovered) && styles.chipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    width: '100%',
    alignContent: 'stretch',
  },
  chipGridExpanded: {
    marginTop: 12,
    flex: 1,
  },
  chipWrapper: {
    width: '50%',
    height: '25%',
    padding: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  chipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#EAF3FF',
  },
  chipHovered: {
    borderColor: '#0A84FF',
    backgroundColor: '#DDEEFF',
  },
  selectedChipButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
