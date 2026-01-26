import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import type { AuthUser } from '@meal-planning/shared';
import { convertFirebaseUser as convertFirebaseUserShared } from '@meal-planning/shared';

// Re-export AuthUser type for convenience
export type { AuthUser };

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      uid: result.user.uid,
      email: result.user.email,
      phoneNumber: result.user.phoneNumber,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<AuthUser> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return {
      uid: result.user.uid,
      email: result.user.email,
      phoneNumber: result.user.phoneNumber,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    throw error;
  }
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * Call this before signInWithPhoneNumber
 */
export function initializeRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      // Response expired, ask user to solve reCAPTCHA again
      console.error('reCAPTCHA expired');
    },
  });

  return recaptchaVerifier;
}

/**
 * Sign in with phone number (web)
 * Requires reCAPTCHA verifier to be initialized first
 */
export async function signInWithPhoneNumberWeb(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending SMS code:', error);
    throw error;
  }
}

/**
 * Verify phone number with SMS code (web)
 */
export async function verifyPhoneCodeWeb(
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
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
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
