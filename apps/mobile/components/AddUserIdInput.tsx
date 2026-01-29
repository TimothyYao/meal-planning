import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface AddUserIdInputProps {
  onAdd: (userId: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  label?: string;
}

export default function AddUserIdInput({ 
  onAdd, 
  placeholder = 'Enter user ID',
  buttonText = 'Add',
  label = 'Add User ID'
}: AddUserIdInputProps) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setUserId(''); // Clear input on success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={(text) => {
            setUserId(text);
            setError(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={fontColor.quaternary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TouchableOpacity 
          style={[styles.addButton, loading && styles.addButtonDisabled]} 
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <Text style={styles.addButtonText}>...</Text>
          ) : (
            <>
              <Ionicons name="add" size={18} color={fontColor.inverse} />
              <Text style={styles.addButtonText}>{buttonText}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.status.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: fontColor.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: fontColor.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  addButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: fontColor.inverse,
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
});
