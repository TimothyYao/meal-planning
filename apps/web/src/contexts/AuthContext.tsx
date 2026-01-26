import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithApple,
  initializeRecaptcha,
  signInWithPhoneNumberWeb,
  verifyPhoneCodeWeb,
  signOut as authSignOut,
  getCurrentUser,
  onAuthStateChange,
  convertFirebaseUser,
  AuthUser,
} from '../utils/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    // Check initial auth state
    const currentUser = getCurrentUser();
    setUser(convertFirebaseUser(currentUser));
    setLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((firebaseUser: User | null) => {
      setUser(convertFirebaseUser(firebaseUser));
      setLoading(false);
    });

    // Initialize reCAPTCHA for phone auth
    try {
      recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
    }

    return () => {
      unsubscribe();
      // Clean up reCAPTCHA
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      const authUser = await signInWithGoogle();
      setUser(authUser);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const handleSignInWithApple = async () => {
    try {
      const authUser = await signInWithApple();
      setUser(authUser);
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw error;
    }
  };

  const handleSignInWithPhone = async (phoneNumber: string) => {
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = initializeRecaptcha('recaptcha-container');
      }
      const confirmationResult = await signInWithPhoneNumberWeb(
        phoneNumber,
        recaptchaVerifierRef.current
      );
      return confirmationResult;
    } catch (error) {
      console.error('Error sending SMS code:', error);
      throw error;
    }
  };

  const handleVerifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      const authUser = await verifyPhoneCodeWeb(confirmationResult, code);
      setUser(authUser);
    } catch (error) {
      console.error('Error verifying phone code:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    signInWithPhone: handleSignInWithPhone,
    verifyPhoneCode: handleVerifyPhoneCode,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
