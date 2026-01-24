import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, MacroTargets, formatMacroValue } from '@meal-planning/shared';
import { getTodayLog, setTodayTargetMacros } from '../utils/storage';

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

  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('65');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [originalTargets, setOriginalTargets] = useState<MacroTargets | null>(null);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const todayLog = await getTodayLog();
      if (todayLog?.targetMacros) {
        setCalories(todayLog.targetMacros.calories.toString());
        setProtein(todayLog.targetMacros.protein.toString());
        setCarbs(todayLog.targetMacros.carbs.toString());
        setFat(todayLog.targetMacros.fat.toString());
        setOriginalTargets(todayLog.targetMacros);
      } else {
        const defaults = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
        setOriginalTargets(defaults);
      }
    } catch (error) {
      console.error('Error loading targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalTargets) {
      setCalories(originalTargets.calories.toString());
      setProtein(originalTargets.protein.toString());
      setCarbs(originalTargets.carbs.toString());
      setFat(originalTargets.fat.toString());
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    const targets: MacroTargets = {
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
    };

    if (targets.calories <= 0) {
      Alert.alert('Error', 'Calories must be greater than 0');
      return;
    }

    try {
      await setTodayTargetMacros(targets);
      setOriginalTargets(targets);
      setIsEditing(false);
      Alert.alert('Success', 'Target macros updated');
    } catch (error) {
      console.error('Error saving targets:', error);
      Alert.alert('Error', 'Failed to save targets. Please try again.');
    }
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Macro Targets</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButtonSmall}>
                <Text style={styles.saveButtonTextSmall}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEditing ? (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="2000"
              />
            </View>

            <View style={styles.macroInputRow}>
              <View style={styles.macroInputContainer}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.macroInput}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  placeholder="150"
                />
              </View>
              <View style={styles.macroInputContainer}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.macroInput}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  placeholder="200"
                />
              </View>
              <View style={styles.macroInputContainer}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.macroInput}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                  placeholder="65"
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>
                {formatMacroValue(parseFloat(calories) || 0, 'calories')}
              </Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(parseFloat(protein) || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(parseFloat(carbs) || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(parseFloat(fat) || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </>
        )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonTextSmall: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  inputRow: {
    marginBottom: 16,
  },
  macroInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  macroInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  macroInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
