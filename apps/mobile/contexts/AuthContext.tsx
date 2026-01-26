import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, ConfirmationResult } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithPhoneNumber,
  verifyPhoneCode,
  signOut as authSignOut,
  getCurrentUser,
  onAuthStateChange,
  convertFirebaseUser,
  AuthUser,
  type ApplicationVerifier,
} from '../utils/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  /** On mobile, pass FirebaseRecaptchaVerifierModal ref as second arg. */
  signInWithPhone: (phoneNumber: string, applicationVerifier?: ApplicationVerifier) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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

    return unsubscribe;
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

  const handleSignInWithPhone = async (
    phoneNumber: string,
    applicationVerifier?: ApplicationVerifier
  ) => {
    try {
      const confirmationResult = await signInWithPhoneNumber(phoneNumber, applicationVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('Error sending SMS code:', error);
      throw error;
    }
  };

  const handleVerifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      const authUser = await verifyPhoneCode(confirmationResult, code);
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
