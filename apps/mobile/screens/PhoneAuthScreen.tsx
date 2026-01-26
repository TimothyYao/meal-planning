import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_APP_OPTIONS } from 'expo-firebase-core';
import { useAuth } from '../contexts/AuthContext';
import { firebaseConfig } from '../config/firebase';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { CountryCodePicker } from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, type CountryItem } from '../utils/countryCodes';
import { FirebaseRecaptchaVerifierModal, FirebaseAuthApplicationVerifier } from 'expo-firebase-recaptcha';
import { MockRecaptchaVerifier } from '../utils/mockRecaptchaVerifier';
import {
  requestNotificationPermissions,
  setupNotificationListeners,
  getExpoPushToken,
  areNotificationsEnabled,
} from '../utils/pushNotifications';
import type { ConfirmationResult } from 'firebase/auth';

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { signInWithPhone, verifyPhoneCode, user } = useAuth();
  const recaptchaVerifierRef = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const customVerifierRef = useRef<FirebaseAuthApplicationVerifier | null>(null);

  const [countryCode, setCountryCode] = useState<CountryItem>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

  // Option to skip reCAPTCHA (ONLY for test phone numbers)
  // Set to true to use mock verifier that skips reCAPTCHA
  // This ONLY works with test phone numbers configured in Firebase Console
  const SKIP_RECAPTCHA = __DEV__ && process.env.EXPO_PUBLIC_SKIP_RECAPTCHA === 'true';
  const [useNativePush, setUseNativePush] = React.useState(false);

  // Request notification permissions and set up verifier
  React.useEffect(() => {
    let notificationListeners: { remove: () => void } | null = null;

    const setupNotifications = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          console.log('✅ Notification permissions granted - using native push verifier');
          
          // Get push token (Firebase uses this for silent verification)
          const token = await getExpoPushToken();
          if (token) {
            console.log('📱 Expo push token obtained:', token.substring(0, 20) + '...');
          }

          // Set up notification listeners for Firebase phone auth
          notificationListeners = setupNotificationListeners((notification) => {
            console.log('📬 Silent push notification received for phone auth');
            // Firebase handles these automatically - no action needed
          });

          // Use native push verifier when notifications are enabled
          setUseNativePush(true);
        } else {
          console.warn('⚠️ Notification permissions not granted - will use reCAPTCHA fallback');
          setUseNativePush(false);
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
        setUseNativePush(false);
      }
    };

    setupNotifications();

    return () => {
      if (notificationListeners) {
        notificationListeners.remove();
      }
    };
  }, []);

  // Initialize verifier based on available options
  React.useEffect(() => {
    if (SKIP_RECAPTCHA) {
      // Use mock verifier that skips reCAPTCHA (only works with test numbers)
      customVerifierRef.current = new MockRecaptchaVerifier() as FirebaseAuthApplicationVerifier;
      console.warn('⚠️ Using mock reCAPTCHA verifier - only works with test phone numbers!');
    } else {
      // Use expo-firebase-recaptcha's FirebaseRecaptchaVerifierModal
      // This properly handles reCAPTCHA in React Native
      // Firebase will automatically try silent push first if configured, then show reCAPTCHA
      if (useNativePush) {
        console.log('✅ Native push available - Firebase will try silent push first, then show reCAPTCHA if needed');
      } else {
        console.log('⚠️ Using reCAPTCHA verifier (native push not available)');
      }
    }
    return () => {
      if (SKIP_RECAPTCHA) {
        customVerifierRef.current = null;
      }
    };
  }, [SKIP_RECAPTCHA, useNativePush]);

  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    const fullNumber = countryCode.dial + digits;
    console.log('Sending code to:', fullNumber);
    setLoading(true);
    try {
      // Use expo-firebase-recaptcha verifier if not skipping, otherwise use mock
      const verifier: FirebaseAuthApplicationVerifier | null = SKIP_RECAPTCHA 
        ? customVerifierRef.current 
        : recaptchaVerifierRef.current;
      
      if (!verifier) {
        console.error('reCAPTCHA verifier is null');
        Alert.alert('Error', 'reCAPTCHA verifier not ready. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Verifier ready, calling signInWithPhone...', { 
        hasVerifier: !!verifier, 
        useNativePush,
        skipRecaptcha: SKIP_RECAPTCHA
      });
      setRecaptchaError(null);
      
      // Always pass verifier - Firebase requires it in React Native
      // Firebase will automatically try silent push first if configured, then use the verifier
      const result = await signInWithPhone(fullNumber, verifier);
      console.log('Code sent successfully, confirmation result:', result);
      setConfirmationResult(result);
      setStep('code');
      Alert.alert('Code sent', 'Enter the verification code from your SMS.');
    } catch (e: unknown) {
      console.error('Error in handleSendCode:', e);
      let msg = 'Failed to send verification code';
      
      if (e instanceof Error) {
        msg = e.message;
        console.error('Error details:', {
          message: e.message,
          name: e.name,
          stack: e.stack,
        });
      }
      
      setRecaptchaError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed || !confirmationResult) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneCode(confirmationResult, trimmed);
      setStep('phone');
      setPhoneNumber('');
      setCode('');
      setConfirmationResult(null);
      
      // Reset navigation stack to go directly to home screen (closes modal)
      // Use navigationRef to reset from root level, closing the modal
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        // Fallback: use current navigation
        const rootNavigator = navigation.getParent() || navigation;
        (rootNavigator as any).reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid verification code';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setCode('');
    setConfirmationResult(null);
    setCountryCode(DEFAULT_COUNTRY);
    setPhoneNumber('');
  };

  // Use our env config (has authDomain which is required for reCAPTCHA)
  // expo-firebase-core config from GoogleService-Info.plist doesn't include authDomain
  const recaptchaFirebaseConfig = React.useMemo(() => {
    // Merge expo-firebase-core config with our env config to ensure we have authDomain
    const mergedConfig = {
      ...(DEFAULT_APP_OPTIONS || {}),
      ...firebaseConfig,
      // Ensure authDomain is set (required for reCAPTCHA)
      authDomain: firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`,
    };
    
    // Validate required fields
    if (!mergedConfig.apiKey || !mergedConfig.authDomain || !mergedConfig.projectId) {
      console.error('Invalid Firebase config for reCAPTCHA:', mergedConfig);
    }
    
    return mergedConfig;
  }, []);

  const hasValidConfig =
    (recaptchaFirebaseConfig.apiKey &&
      recaptchaFirebaseConfig.projectId &&
      recaptchaFirebaseConfig.authDomain) ||
    (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);

  // Log config status for debugging (remove in production)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('Firebase config check:', {
        usingExpoCore: !!DEFAULT_APP_OPTIONS?.apiKey,
        hasApiKey: !!recaptchaFirebaseConfig.apiKey,
        hasProjectId: !!recaptchaFirebaseConfig.projectId,
        hasAuthDomain: !!recaptchaFirebaseConfig.authDomain,
        apiKeyLength: recaptchaFirebaseConfig.apiKey?.length || 0,
        authDomain: recaptchaFirebaseConfig.authDomain,
        projectId: recaptchaFirebaseConfig.projectId,
      });
      
      // Validate config format
      if (!recaptchaFirebaseConfig.authDomain) {
        console.error('❌ Missing authDomain in Firebase config!');
      }
      if (!recaptchaFirebaseConfig.apiKey) {
        console.error('❌ Missing apiKey in Firebase config!');
      }
      if (!recaptchaFirebaseConfig.projectId) {
        console.error('❌ Missing projectId in Firebase config!');
      }
    }
  }, [recaptchaFirebaseConfig]);

  // Early return for signed-in users - must be after all hooks
  if (user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.signedIn}>
          <Ionicons name="checkmark-circle" size={64} color={colors.status.success} />
          <Text style={styles.signedInTitle}>Signed in</Text>
          <Text style={styles.signedInDetail}>
            {user.phoneNumber || user.email || user.uid}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!SKIP_RECAPTCHA && (
          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifierRef}
            firebaseConfig={recaptchaFirebaseConfig}
            attemptInvisibleVerification={useNativePush}
            title="Verify you're human"
            cancelLabel="Cancel"
          />
        )}

        <Text style={styles.title}>Sign in with phone</Text>
        <Text style={styles.subtitle}>
          Enter your phone number. US (+1) is selected by default.
        </Text>
        {__DEV__ && (
          <View style={styles.testInfo}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={styles.testInfoText}>
              <Text style={{ fontWeight: '600' }}>Skip reCAPTCHA:</Text> Use test phone numbers from Firebase Console. See TEST_PHONE_NUMBERS.md for setup.
            </Text>
          </View>
        )}

        {!hasValidConfig && (
          <View style={styles.configWarning}>
            <Ionicons name="warning" size={20} color={colors.status.warning} />
            <Text style={styles.configWarningText}>
              Add Firebase config to .env (see FIREBASE_API_KEY.md)
            </Text>
          </View>
        )}

        {recaptchaError && (
          <View style={[styles.configWarning, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.status.error} />
            <Text style={[styles.configWarningText, { color: '#D32F2F' }]}>
              {recaptchaError}
            </Text>
          </View>
        )}

        {step === 'phone' ? (
          <View style={styles.form}>
            <View style={styles.phoneRow}>
              <CountryCodePicker
                value={countryCode}
                onSelect={setCountryCode}
                disabled={loading}
              />
              <TextInput
                style={styles.phoneInput}
                placeholder="234 567 8900"
                placeholderTextColor={fontColor.disabled}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading || !hasValidConfig}
            >
              {loading ? (
                <ActivityIndicator color={fontColor.inverse} />
              ) : (
                <Text style={styles.buttonText}>Send verification code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#8E8E93"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={fontColor.inverse} />
              ) : (
                <Text style={styles.buttonText}>Verify code</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleChangeNumber}
              disabled={loading}
            >
              <Text style={styles.linkButtonText}>Use a different number</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing['2xl'],
    paddingBottom: 48,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: fontColor.primary,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: fontColor.disabled,
    marginBottom: spacing['2xl'],
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF9E6',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing['2xl'],
  },
  configWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
  form: {
    gap: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.md,
    color: fontColor.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: fontColor.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: fontColor.inverse,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  linkButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: fontSize.base,
  },
  signedIn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  signedInTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  signedInDetail: {
    fontSize: fontSize.base,
    color: fontColor.disabled,
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  testInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.semantic.info,
    lineHeight: 18,
  },
});
