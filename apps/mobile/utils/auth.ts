import { 
  signInWithCredential, 
  signOut as firebaseSignOut,
  User,
  OAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  PhoneAuthProvider,
  ConfirmationResult,
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import type { AuthUser } from '@meal-planning/shared';
import { convertFirebaseUser as convertFirebaseUserShared } from '@meal-planning/shared';
import { clearAllCaches, resetRepositories } from '../storage';
import { clearUSDACache } from './usdaCache';
import { clearOFFCache } from './offCache';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Re-export AuthUser type for convenience
export type { AuthUser };

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    // Create OAuth request
    const request = new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'com.mealplanning.mobile',
        path: 'auth',
      }),
      extraParams: {},
    });

    // Get authorization URL
    const result = await request.promptAsync(googleDiscovery, {
      showInRecents: true,
    });

    if (result.type !== 'success' || !result.params.code) {
      throw new Error('Google sign-in was cancelled or failed');
    }

    // Exchange code for token
    const tokenResponse = await fetch(googleDiscovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: result.params.code,
        client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirect_uri: AuthSession.makeRedirectUri({
          scheme: 'com.mealplanning.mobile',
          path: 'auth',
        }),
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.id_token) {
      throw new Error('Failed to get ID token from Google');
    }

    // Sign in with Firebase using the Google credential
    const credential = GoogleAuthProvider.credential(tokenData.id_token);
    const userCredential = await signInWithCredential(auth, credential);
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      phoneNumber: userCredential.user.phoneNumber,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
    };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Apple
 * Uses native Apple Authentication on iOS, OAuth flow on other platforms
 */
export async function signInWithApple(): Promise<AuthUser> {
  try {
    // Use native Apple Authentication on iOS
    const appleAvailable = Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
    if (appleAvailable) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple credential
      const provider = new OAuthProvider('apple.com');
      const rawNonce = (credential as { nonce?: string }).nonce;
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken!,
        rawNonce: rawNonce ?? undefined,
      });

      const userCredential = await signInWithCredential(auth, firebaseCredential);
      
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        phoneNumber: userCredential.user.phoneNumber,
        displayName: userCredential.user.displayName || 
                     (credential.fullName ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : null),
        photoURL: userCredential.user.photoURL,
      };
    } else {
      // Fallback to OAuth flow for Android/Web (if needed)
      // Note: Apple Sign In on Android requires web-based OAuth
      throw new Error('Apple Sign In is only available on iOS devices');
    }
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      throw new Error('Apple sign-in was cancelled');
    }
    console.error('Error signing in with Apple:', error);
    throw error;
  }
}

/** Application verifier for phone auth (e.g. expo-firebase-recaptcha modal ref) */
export interface ApplicationVerifier {
  type: string;
  verify(): Promise<string>;
}

/**
 * Sign in with phone number
 * Sends SMS verification code to the phone number.
 * On mobile, pass the FirebaseRecaptchaVerifierModal ref as applicationVerifier.
 */
export async function signInWithPhoneNumber(
  phoneNumber: string,
  applicationVerifier?: ApplicationVerifier
): Promise<ConfirmationResult> {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    console.log('signInWithPhoneNumber called with:', { formattedPhone, hasVerifier: !!applicationVerifier });
    
    // In React Native, Firebase requires a verifier
    // Firebase will automatically try silent push first if configured, then use the verifier
    if (!applicationVerifier) {
      throw new Error('Application verifier is required for phone authentication in React Native');
    }

    // Verify the verifier is ready
    if (typeof applicationVerifier.verify !== 'function') {
      throw new Error('Application verifier is not properly initialized');
    }

    console.log('Calling Firebase signInWithPhoneNumber...');
    const confirmationResult = await firebaseSignInWithPhoneNumber(
      auth,
      formattedPhone,
      applicationVerifier as any // Firebase expects ApplicationVerifier type
    );
    console.log('Firebase signInWithPhoneNumber succeeded');
    return confirmationResult;
  } catch (error: any) {
    console.error('Error in signInWithPhoneNumber:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
    });
    
    // Provide more helpful error messages
    if (error?.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please check and try again.');
    } else if (error?.code === 'auth/too-many-requests') {
      throw new Error(
        'SMS rate limit exceeded. This phone number has sent too many verification codes. ' +
        'SOLUTION: Use a test phone number for development (see TEST_PHONE_NUMBERS.md). ' +
        'Or wait 1-2 hours for the limit to reset. ' +
        'Setup: Firebase Console → Authentication → Phone → Phone numbers for testing'
      );
    } else if (error?.code === 'auth/quota-exceeded') {
      throw new Error(
        'SMS quota exceeded. Your Firebase project has exceeded the SMS sending limit. ' +
        'For development, use test phone numbers (see TEST_PHONE_NUMBERS.md). ' +
        'For production, check Firebase Console → Usage and billing.'
      );
    } else if (error?.code === 'auth/billing-not-enabled') {
      throw new Error(
        'Phone authentication requires the Firebase Blaze plan and billing to be enabled. ' +
        'Upgrade in Firebase Console → Usage and billing. See FIREBASE_SETUP.md for details.'
      );
    } else if (error?.code === 'auth/captcha-check-failed' || error?.message?.includes('reCAPTCHA')) {
      throw new Error('reCAPTCHA verification failed. Please try again.');
    }
    
    throw error;
  }
}

/**
 * Verify phone number with SMS code
 */
export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<AuthUser> {
  try {
    const userCredential = await confirmationResult.confirm(code);
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      phoneNumber: userCredential.user.phoneNumber,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
    };
  } catch (error) {
    console.error('Error verifying phone code:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * Also clears all local caches to ensure user data is properly cleaned up
 */
export async function signOut(): Promise<void> {
  try {
    // Sign out from Firebase first
    await firebaseSignOut(auth);
    
    // Clear all local caches to protect user privacy and ensure clean state
    // These operations are run in parallel for better performance
    await Promise.all([
      clearAllCaches(),
      clearUSDACache(),
      clearOFFCache(),
    ]);
    
    // Reset repository singletons so they get recreated on next login
    resetRepositories();
    
    console.log('User signed out and all caches cleared');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get the current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Convert Firebase User to AuthUser
 * Re-exported from shared package for convenience
 */
export function convertFirebaseUser(user: User | null): AuthUser | null {
  return convertFirebaseUserShared(user);
}
