import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface AddUserIdModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (userId: string) => Promise<void>;
}

export default function AddUserIdModal({ visible, onClose, onAdd }: AddUserIdModalProps) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setUserId('');
      setError(null);
    }
  }, [visible]);

  const handleAdd = async () => {
    const trimmedId = userId.trim();

    if (!trimmedId) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd(trimmedId);
      setUserId('');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Share My Foods</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={fontColor.tertiary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Enter the user ID of the person you want to share your foods with.
            They will be able to view and copy all your foods.
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              ref={inputRef}
              style={[styles.input, error && styles.inputError]}
              value={userId}
              onChangeText={(text) => {
                setUserId(text);
                setError(null);
              }}
              placeholder="Paste or type user ID"
              placeholderTextColor={fontColor.quaternary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color={colors.status.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, loading && styles.shareButtonDisabled]}
              onPress={handleAdd}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.shareButtonText}>Sharing...</Text>
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={fontColor.inverse} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: fontColor.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: fontColor.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: fontColor.primary,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.status.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.tertiary,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  shareButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  shareButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.inverse,
  },
});
