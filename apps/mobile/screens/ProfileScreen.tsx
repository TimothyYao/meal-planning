import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, MacroTargets, formatMacroValue, calculateCaloriesFromMacros } from '@meal-planning/shared';
import { getTodayLog, setTodayTargetMacros } from '../utils/storage';
import { NumberEditor } from '../components/NumberEditor';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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

  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(65);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [originalTargets, setOriginalTargets] = useState<MacroTargets | null>(null);
  const [editingField, setEditingField] = useState<'calories' | 'protein' | 'carbs' | 'fat' | null>(null);
  const [autoCalculateCalories, setAutoCalculateCalories] = useState(true);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const todayLog = await getTodayLog();
      if (todayLog?.targetMacros) {
        setCalories(todayLog.targetMacros.calories);
        setProtein(todayLog.targetMacros.protein);
        setCarbs(todayLog.targetMacros.carbs);
        setFat(todayLog.targetMacros.fat);
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

  // Auto-calculate calories from macros when they change
  useEffect(() => {
    if (autoCalculateCalories && isEditing) {
      const calculatedCalories = calculateCaloriesFromMacros(protein, carbs, fat);
      setCalories(calculatedCalories);
    }
  }, [protein, carbs, fat, autoCalculateCalories, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (originalTargets) {
      setCalories(originalTargets.calories);
      setProtein(originalTargets.protein);
      setCarbs(originalTargets.carbs);
      setFat(originalTargets.fat);
    }
    setIsEditing(false);
    setEditingField(null);
    setAutoCalculateCalories(true);
  };

  const handleSave = async () => {
    const targets: MacroTargets = {
      calories: calories || 0,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
    };

    if (targets.calories <= 0) {
      Alert.alert('Error', 'Calories must be greater than 0');
      return;
    }

    try {
      await setTodayTargetMacros(targets);
      setOriginalTargets(targets);
      setIsEditing(false);
      setEditingField(null);
      Alert.alert('Success', 'Target macros updated');
    } catch (error) {
      console.error('Error saving targets:', error);
      Alert.alert('Error', 'Failed to save targets. Please try again.');
    }
  };

  const handleMacroChange = (field: 'protein' | 'carbs' | 'fat', value: number) => {
    if (field === 'protein') {
      setProtein(value);
    } else if (field === 'carbs') {
      setCarbs(value);
    } else if (field === 'fat') {
      setFat(value);
    }
    setEditingField(null);
  };

  const handleCaloriesChange = (value: number) => {
    setCalories(value);
    setAutoCalculateCalories(false); // Disable auto-calculation when manually editing calories
    setEditingField(null);
  };

  const bmi = profile.weight && profile.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : null;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <View style={styles.profilePictureContainer}>
          <Ionicons name="person" size={80} color="#666" />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
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
              <TouchableOpacity
                style={styles.numberPickerButton}
                onPress={() => setEditingField('calories')}
                activeOpacity={0.7}
              >
                <View style={styles.macroInputButtonContent}>
                  <Text style={styles.inputLabel}>Calories</Text>
                  <View style={styles.macroInputValueRow}>
                    <Text style={styles.numberPickerValue}>
                      {Math.round(calories)} cal
                      {autoCalculateCalories && (
                        <Text style={styles.autoCalcIndicator}> (auto)</Text>
                      )}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#007AFF" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.macroInputRow}>
              <TouchableOpacity
                style={styles.macroInputButton}
                onPress={() => setEditingField('protein')}
                activeOpacity={0.7}
              >
                <View style={styles.macroInputButtonContent}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <View style={styles.macroInputValueRow}>
                    <Text style={styles.numberPickerValue}>{Math.round(protein)}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#007AFF" />
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.macroInputButton}
                onPress={() => setEditingField('carbs')}
                activeOpacity={0.7}
              >
                <View style={styles.macroInputButtonContent}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <View style={styles.macroInputValueRow}>
                    <Text style={styles.numberPickerValue}>{Math.round(carbs)}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#007AFF" />
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.macroInputButton}
                onPress={() => setEditingField('fat')}
                activeOpacity={0.7}
              >
                <View style={styles.macroInputButtonContent}>
                  <Text style={styles.inputLabel}>Fat (g)</Text>
                  <View style={styles.macroInputValueRow}>
                    <Text style={styles.numberPickerValue}>{Math.round(fat)}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#007AFF" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <NumberEditor
              visible={editingField === 'calories'}
              value={calories}
              onSave={handleCaloriesChange}
              onCancel={() => setEditingField(null)}
              min={0}
              max={10000}
              title="Calories"
              unit="cal"
            />

            <NumberEditor
              visible={editingField === 'protein'}
              value={protein}
              onSave={(v) => handleMacroChange('protein', v)}
              onCancel={() => setEditingField(null)}
              min={0}
              max={1000}
              title="Protein"
              unit="g"
            />

            <NumberEditor
              visible={editingField === 'carbs'}
              value={carbs}
              onSave={(v) => handleMacroChange('carbs', v)}
              onCancel={() => setEditingField(null)}
              min={0}
              max={1000}
              title="Carbs"
              unit="g"
            />

            <NumberEditor
              visible={editingField === 'fat'}
              value={fat}
              onSave={(v) => handleMacroChange('fat', v)}
              onCancel={() => setEditingField(null)}
              min={0}
              max={1000}
              title="Fat"
              unit="g"
            />
          </>
        ) : (
          <>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>
                {formatMacroValue(calories || 0, 'calories')}
              </Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(protein || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(carbs || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>
                  {formatMacroValue(fat || 0, 'grams')}
                </Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </>
        )}
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
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#e0e0e0',
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
  macroInputButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  macroInputButtonContent: {
    padding: 16,
  },
  macroInputValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  numberPickerButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f0f7ff',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  numberPickerValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  autoCalcIndicator: {
    fontSize: 14,
    fontWeight: '400',
    color: '#007AFF',
    fontStyle: 'italic',
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
