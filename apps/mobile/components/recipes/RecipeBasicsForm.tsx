import { StyleSheet, Text, TextInput, View } from 'react-native';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

interface RecipeBasicsFormProps {
  name: string;
  description: string;
  servings: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onServingsChange: (value: string) => void;
}

export default function RecipeBasicsForm({
  name,
  description,
  servings,
  onNameChange,
  onDescriptionChange,
  onServingsChange,
}: RecipeBasicsFormProps) {
  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>Recipe name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Chicken Stir Fry"
          placeholderTextColor={fontColor.tertiary}
          value={name}
          onChangeText={onNameChange}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional notes or steps"
          placeholderTextColor={fontColor.tertiary}
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Servings *</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={servings}
          onChangeText={onServingsChange}
          placeholder="1"
          placeholderTextColor={fontColor.tertiary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    backgroundColor: colors.background.secondary,
    color: fontColor.primary,
  },
  textArea: {
    minHeight: 90,
  },
});
