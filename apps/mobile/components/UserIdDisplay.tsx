import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface UserIdDisplayProps {
  userId: string | null;
  label?: string;
  description?: string;
}

export default function UserIdDisplay({ 
  userId, 
  label = 'My User ID',
  description = 'Share this ID with others so they can share their foods with you.'
}: UserIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!userId) return;

    try {
      await Clipboard.setStringAsync(userId);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.notLoggedIn}>
          <Ionicons name="alert-circle-outline" size={20} color={fontColor.tertiary} />
          <Text style={styles.notLoggedInText}>Sign in to get your user ID</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.idContainer}>
        <Text style={styles.userId} numberOfLines={1} ellipsizeMode="middle">
          {userId}
        </Text>
        <TouchableOpacity 
          style={[styles.copyButton, copied && styles.copyButtonCopied]} 
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={copied ? 'checkmark' : 'copy-outline'} 
            size={18} 
            color={copied ? colors.status.success : colors.primary} 
          />
          <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
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
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingLeft: spacing.md,
    overflow: 'hidden',
  },
  userId: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: 'monospace',
    color: fontColor.primary,
    paddingVertical: spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  copyButtonCopied: {
    backgroundColor: '#E8F5E9',
  },
  copyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  copyButtonTextCopied: {
    color: colors.status.success,
  },
  description: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  notLoggedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  notLoggedInText: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
});
