import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { MacroTargets, formatMacroValue } from '@meal-planning/shared';

export default function App() {
  // Example usage of shared types
  const targetMacros: MacroTargets = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Planning App</Text>
      <Text style={styles.subtitle}>Daily Macro Targets:</Text>
      <Text>{formatMacroValue(targetMacros.calories, 'calories')}</Text>
      <Text>Protein: {formatMacroValue(targetMacros.protein, 'grams')}</Text>
      <Text>Carbs: {formatMacroValue(targetMacros.carbs, 'grams')}</Text>
      <Text>Fat: {formatMacroValue(targetMacros.fat, 'grams')}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
  },
});
