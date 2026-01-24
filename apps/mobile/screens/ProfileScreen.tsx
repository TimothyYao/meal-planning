import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { UserProfile, MacroTargets, formatMacroValue } from '@meal-planning/shared';

export default function ProfileScreen() {
  // Example profile data - in a real app, this would come from state/storage
  const profile: UserProfile = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    height: 175, // cm
    weight: 75, // kg
    activityLevel: 'moderate',
    goal: 'maintain',
    targetMacros: {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    },
  };

  const bmi = profile.weight && profile.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {profile.age && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{profile.age} years</Text>
          </View>
        )}
        {profile.height && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>{profile.height} cm</Text>
          </View>
        )}
        {profile.weight && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{profile.weight} kg</Text>
          </View>
        )}
        {bmi && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI:</Text>
            <Text style={styles.infoValue}>{bmi}</Text>
          </View>
        )}
        {profile.activityLevel && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Activity Level:</Text>
            <Text style={styles.infoValue}>
              {profile.activityLevel.charAt(0).toUpperCase() + profile.activityLevel.slice(1)}
            </Text>
          </View>
        )}
        {profile.goal && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Goal:</Text>
            <Text style={styles.infoValue}>
              {profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)} weight
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Macro Targets</Text>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>
            {formatMacroValue(profile.targetMacros.calories, 'calories')}
          </Text>
          <Text style={styles.macroLabel}>Calories</Text>
        </View>
        <View style={styles.macroRow}>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>
              {formatMacroValue(profile.targetMacros.protein, 'grams')}
            </Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>
              {formatMacroValue(profile.targetMacros.carbs, 'grams')}
            </Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>
              {formatMacroValue(profile.targetMacros.fat, 'grams')}
            </Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 14,
    color: '#666',
  },
});
