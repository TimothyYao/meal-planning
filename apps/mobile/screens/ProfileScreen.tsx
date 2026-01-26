import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { UserProfile, MacroTargets, formatMacroValue, calculateCaloriesFromMacros, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { getTodayLog, setTodayTargetMacros } from '../storage';
import { NumberEditor } from '../components/NumberEditor';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from '../utils/firestore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, loading: authLoading, signOut } = useAuth();

  // Example profile data - in a real app, this would come from state/storage
  const profile: UserProfile = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    height: 175, // cm
    weight: 75, // kg
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
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [originalDisplayName, setOriginalDisplayName] = useState<string>('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasSavedTargets, setHasSavedTargets] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [editingPersonalField, setEditingPersonalField] = useState<'age' | 'height' | 'weight' | 'goal' | null>(null);

  const DISPLAY_NAME_KEY = '@meal_planning:display_name';
  const PROFILE_IMAGE_KEY = '@meal_planning:profile_image';
  const HAS_SAVED_TARGETS_KEY = '@meal_planning:has_saved_targets';

  useEffect(() => {
    loadTargets();
    loadDisplayName();
    loadProfileImage();
    loadPersonalInfo();
  }, [user]);

  const loadTargets = async () => {
    try {
      // Check if user has saved targets before
      const hasSaved = await AsyncStorage.getItem(HAS_SAVED_TARGETS_KEY);
      const hasSavedBefore = hasSaved === 'true';
      setHasSavedTargets(hasSavedBefore);

      if (hasSavedBefore && user) {
        // Load from Firestore if user has saved before
        try {
          const profileData = await getUserProfileFromFirestore();
          if (profileData?.targetMacros) {
            setCalories(profileData.targetMacros.calories);
            setProtein(profileData.targetMacros.protein);
            setCarbs(profileData.targetMacros.carbs);
            setFat(profileData.targetMacros.fat);
            setOriginalTargets(profileData.targetMacros);
            setLoading(false);
            return;
          }
        } catch (firestoreError) {
          console.log('Could not load targets from Firestore, using defaults:', firestoreError);
        }
      }

      // Fallback to today's log or defaults
      const todayLog = await getTodayLog();
      if (todayLog?.targetMacros) {
        setCalories(todayLog.targetMacros.calories);
        setProtein(todayLog.targetMacros.protein);
        setCarbs(todayLog.targetMacros.carbs);
        setFat(todayLog.targetMacros.fat);
        setOriginalTargets(todayLog.targetMacros);
      } else {
        const defaults = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
        setCalories(defaults.calories);
        setProtein(defaults.protein);
        setCarbs(defaults.carbs);
        setFat(defaults.fat);
        setOriginalTargets(defaults);
      }
    } catch (error) {
      console.error('Error loading targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisplayName = async () => {
    try {
      if (user) {
        // Try to load from Firestore first (follows security rules)
        try {
          const profileData = await getUserProfileFromFirestore();
          if (profileData?.displayName) {
            setDisplayName(profileData.displayName);
            setOriginalDisplayName(profileData.displayName);
            await AsyncStorage.setItem(DISPLAY_NAME_KEY, profileData.displayName);
            return;
          }
        } catch (firestoreError) {
          console.log('Could not load from Firestore, trying cache:', firestoreError);
        }

        // Fallback to local storage
        const savedName = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
        if (savedName) {
          setDisplayName(savedName);
          setOriginalDisplayName(savedName);
        } else if (user.displayName) {
          // Use Firebase Auth display name if available
          setDisplayName(user.displayName);
          setOriginalDisplayName(user.displayName);
        } else {
          // Default to "User"
          setDisplayName('User');
          setOriginalDisplayName('User');
        }
      }
    } catch (error) {
      console.error('Error loading display name:', error);
    }
  };

  const handleSaveDisplayName = async () => {
    try {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        Alert.alert('Error', 'Display name cannot be empty');
        setDisplayName(originalDisplayName);
        setIsEditingDisplayName(false);
        return;
      }
      
      // Save to AsyncStorage (cache)
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
      
      // Save to Firestore (follows security rules)
      await saveUserProfileToFirestore({ displayName: trimmedName });
      
      // Update Firebase Auth profile (optional, for consistency)
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: trimmedName });
        }
      } catch (firebaseError) {
        // Firebase Auth update is optional, Firestore is primary
        console.log('Firebase Auth profile update skipped:', firebaseError);
      }
      
      setOriginalDisplayName(trimmedName);
      setIsEditingDisplayName(false);
    } catch (error) {
      console.error('Error saving display name:', error);
      Alert.alert('Error', 'Failed to save display name. Please try again.');
    }
  };

  const handleCancelDisplayName = () => {
    setDisplayName(originalDisplayName);
    setIsEditingDisplayName(false);
  };

  const loadProfileImage = async () => {
    try {
      if (user) {
        // Try to load from Firestore first (follows security rules)
        try {
          const profileData = await getUserProfileFromFirestore();
          if (profileData?.photoURL) {
            setProfileImageUri(profileData.photoURL);
            await AsyncStorage.setItem(PROFILE_IMAGE_KEY, profileData.photoURL);
            return;
          }
        } catch (firestoreError) {
          console.log('Could not load from Firestore, trying cache:', firestoreError);
        }

        // Fallback to local storage
        const savedImageUrl = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
        if (savedImageUrl) {
          setProfileImageUri(savedImageUrl);
        } else if (user.photoURL) {
          // Use Firebase Auth photo URL if available
          setProfileImageUri(user.photoURL);
        }
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const requestImagePickerPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to set a profile picture.'
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to upload a profile picture.');
      return;
    }

    const hasPermission = await requestImagePickerPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        // Update UI immediately (synchronous)
        setProfileImageUri(imageUri);
        // Upload in background (non-blocking)
        uploadProfileImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!user || !auth.currentUser) {
      Alert.alert('Error', 'Please sign in to upload a profile picture.');
      // Revert image if not authenticated
      setProfileImageUri(null);
      return;
    }

    setUploadingImage(true);

    // Upload to Firebase in the background (non-blocking)
    (async () => {
      try {
        // Convert image URI to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Use fixed filename to replace old profile picture
        // Path format: users/{userId}/profile.jpg (matches Firestore structure)
        const filename = `users/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filename);

        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Save to AsyncStorage (cache)
        await AsyncStorage.setItem(PROFILE_IMAGE_KEY, downloadURL);

        // Save to Firestore (follows security rules)
        await saveUserProfileToFirestore({ photoURL: downloadURL });

        // Update Firebase Auth profile (optional, for consistency)
        try {
          await updateProfile(auth.currentUser, { photoURL: downloadURL });
        } catch (authError) {
          console.log('Could not update Auth profile, but Firestore saved:', authError);
        }

        // Update local state with the Firebase URL (replaces local URI)
        setProfileImageUri(downloadURL);
        
        console.log('Profile picture uploaded successfully');
      } catch (error: any) {
        console.error('Error uploading profile image:', error);
        console.error('Error details:', {
          code: error?.code,
          message: error?.message,
          serverResponse: error?.serverResponse,
        });
        
        // Revert to previous image if upload fails
        try {
          const previousImageUrl = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
          if (previousImageUrl) {
            setProfileImageUri(previousImageUrl);
          } else if (user.photoURL) {
            setProfileImageUri(user.photoURL);
          } else {
            setProfileImageUri(null);
          }
        } catch (revertError) {
          console.error('Error reverting image:', revertError);
          setProfileImageUri(null);
        }
        
        let errorMessage = 'Failed to upload profile picture. Please try again.';
        
        if (error?.code === 'storage/unauthorized') {
          errorMessage = 'Storage permission denied. Please check Firebase Storage security rules.';
        } else if (error?.code === 'storage/quota-exceeded') {
          errorMessage = 'Storage quota exceeded. Please check your Firebase plan.';
        } else if (error?.code === 'storage/unauthenticated') {
          errorMessage = 'Please sign in to upload a profile picture.';
        } else if (error?.code === 'storage/unknown') {
          errorMessage = 'Storage error. Please check:\n1. Firebase Storage is enabled\n2. Storage security rules allow uploads\n3. Storage bucket is configured correctly';
        }
        
        Alert.alert('Upload Failed', errorMessage);
      } finally {
        setUploadingImage(false);
      }
    })();
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
      // Save to today's log (local cache)
      await setTodayTargetMacros(targets);
      
      // Save to Firestore user profile (if authenticated)
      if (user) {
        try {
          await saveUserProfileToFirestore({ targetMacros: targets });
          // Mark that user has saved targets
          await AsyncStorage.setItem(HAS_SAVED_TARGETS_KEY, 'true');
          setHasSavedTargets(true);
        } catch (firestoreError) {
          console.error('Error saving targets to Firestore:', firestoreError);
          // Continue anyway - local save succeeded
        }
      }
      
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

  const loadPersonalInfo = async () => {
    try {
      if (user) {
        // Try to load from Firestore first
        try {
          const profileData = await getUserProfileFromFirestore();
          if (profileData) {
            if (profileData.age !== undefined) setAge(profileData.age);
            if (profileData.height !== undefined) setHeight(profileData.height);
            if (profileData.weight !== undefined) setWeight(profileData.weight);
            if (profileData.goal) setGoal(profileData.goal);
            return;
          }
        } catch (firestoreError) {
          console.log('Could not load personal info from Firestore:', firestoreError);
        }
      }
    } catch (error) {
      console.error('Error loading personal info:', error);
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!user) return;
    
    const profileData: any = {};
    if (age !== null) profileData.age = age;
    if (height !== null) profileData.height = height;
    if (weight !== null) profileData.weight = weight;
    if (goal) profileData.goal = goal;

    // Save to Firestore in background
    saveUserProfileToFirestore(profileData).catch((error) => {
      console.error('Error saving personal info to Firestore:', error);
    });
  };

  const handlePersonalFieldChange = (field: 'age' | 'height' | 'weight', value: number) => {
    if (field === 'age') {
      setAge(value);
    } else if (field === 'height') {
      setHeight(value);
    } else if (field === 'weight') {
      setWeight(value);
    }
    setEditingPersonalField(null);
    handleSavePersonalInfo();
  };

  const handleGoalChange = (newGoal: 'lose' | 'maintain' | 'gain') => {
    setGoal(newGoal);
    setEditingPersonalField(null);
    handleSavePersonalInfo();
  };

  const bmi = weight && height
    ? (weight / ((height / 100) ** 2)).toFixed(1)
    : null;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profilePictureContainer}
          onPress={handlePickImage}
          disabled={uploadingImage || !user}
          activeOpacity={uploadingImage ? 1 : 0.7}
        >
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={80} color={fontColor.tertiary} />
          )}
        </TouchableOpacity>
        {user ? (
          <>
            {isEditingDisplayName ? (
              <View style={styles.displayNameEditContainer}>
                <TextInput
                  style={styles.displayNameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  autoFocus
                  maxLength={50}
                />
                <View style={styles.displayNameActions}>
                  <TouchableOpacity
                    style={styles.displayNameCancelButton}
                    onPress={handleCancelDisplayName}
                  >
                    <Text style={styles.displayNameCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.displayNameSaveButton}
                    onPress={handleSaveDisplayName}
                  >
                    <Text style={styles.displayNameSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditingDisplayName(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.name}>{displayName || 'Tap to set name'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Account',
                  'Sign out of your account?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Sign out',
                      style: 'destructive',
                      onPress: () => signOut(),
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.email}>
                {user.phoneNumber || user.email || user.uid}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <TouchableOpacity
              style={styles.phoneAuthButton}
              onPress={() => navigation.getParent()?.navigate('PhoneAuth' as never)}
              disabled={authLoading}
            >
              <Ionicons name="call" size={20} color={fontColor.inverse} />
              <Text style={styles.phoneAuthButtonText}>Sign in with phone</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Macro Targets</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
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
        
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setEditingPersonalField('age')}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Age:</Text>
          <View style={styles.infoValueRow}>
            <Text style={styles.infoValue}>{age !== null ? `${age} years` : 'Tap to set'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setEditingPersonalField('height')}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Height:</Text>
          <View style={styles.infoValueRow}>
            <Text style={styles.infoValue}>{height !== null ? `${height} cm` : 'Tap to set'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setEditingPersonalField('weight')}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Weight:</Text>
          <View style={styles.infoValueRow}>
            <Text style={styles.infoValue}>{weight !== null ? `${weight} kg` : 'Tap to set'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {bmi && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI:</Text>
            <Text style={styles.infoValue}>{bmi}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setEditingPersonalField('goal')}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Goal:</Text>
          <View style={styles.infoValueRow}>
            <Text style={styles.infoValue}>
              {goal 
                ? `${goal.charAt(0).toUpperCase() + goal.slice(1)} weight`
                : 'Tap to set'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <NumberEditor
          visible={editingPersonalField === 'age'}
          value={age || 0}
          onSave={(v) => handlePersonalFieldChange('age', v)}
          onCancel={() => setEditingPersonalField(null)}
          min={1}
          max={150}
          title="Age"
          unit="years"
        />

        <NumberEditor
          visible={editingPersonalField === 'height'}
          value={height || 0}
          onSave={(v) => handlePersonalFieldChange('height', v)}
          onCancel={() => setEditingPersonalField(null)}
          min={50}
          max={300}
          title="Height"
          unit="cm"
        />

        <NumberEditor
          visible={editingPersonalField === 'weight'}
          value={weight || 0}
          onSave={(v) => handlePersonalFieldChange('weight', v)}
          onCancel={() => setEditingPersonalField(null)}
          min={20}
          max={500}
          title="Weight"
          unit="kg"
        />

        {editingPersonalField === 'goal' && (
          <View style={styles.pickerModal}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Goal</Text>
                <TouchableOpacity
                  onPress={() => setEditingPersonalField(null)}
                  style={styles.pickerCloseButton}
                >
                  <Text style={styles.pickerCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={goal || 'maintain'}
                onValueChange={handleGoalChange}
                style={styles.picker}
              >
                <Picker.Item label="Lose Weight" value="lose" />
                <Picker.Item label="Maintain Weight" value="maintain" />
                <Picker.Item label="Gain Weight" value="gain" />
              </Picker>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  phoneAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  phoneAuthButtonText: {
    color: fontColor.inverse,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: colors.border.light,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  editButton: {
    padding: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cancelButtonText: {
    color: fontColor.tertiary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  saveButtonSmall: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonTextSmall: {
    color: fontColor.inverse,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  pickerContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  pickerCloseButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pickerCloseText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
  inputRow: {
    marginBottom: spacing.lg,
  },
  macroInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  macroInputContainer: {
    flex: 1,
  },
  macroInputButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  macroInputButtonContent: {
    padding: spacing.lg,
  },
  macroInputValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    marginBottom: spacing.sm,
    color: fontColor.secondary,
  },
  numberPickerButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: '#f0f7ff',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  numberPickerValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.secondary,
    marginTop: spacing.xs,
  },
  autoCalcIndicator: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    color: colors.primary,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: fontColor.inverse,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  displayNameEditContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  displayNameInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.md,
  },
  displayNameActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  displayNameCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  displayNameCancelText: {
    color: fontColor.tertiary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  displayNameSaveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  displayNameSaveText: {
    color: fontColor.inverse,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
