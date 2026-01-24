import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Planning App</Text>
      <Text style={styles.subtitle}>Daily Macro Targets:</Text>
      <Text style={styles.macroText}>2000 cal</Text>
      <Text style={styles.macroText}>Protein: 150g</Text>
      <Text style={styles.macroText}>Carbs: 200g</Text>
      <Text style={styles.macroText}>Fat: 65g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
  macroText: {
    fontSize: 16,
    marginVertical: 5,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
  },
});
