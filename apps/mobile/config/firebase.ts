import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from '@firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration - set via environment variables (see FIREBASE_API_KEY.md)
const rawApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';

// Validate and clean API key (remove any accidental prefixes)
let apiKey = rawApiKey.trim();
if (apiKey && !apiKey.startsWith('AIza')) {
  // Try to fix common issues: remove leading 'y' or other characters
  if (apiKey.startsWith('yAIza') || apiKey.startsWith('YAIza')) {
    console.warn('⚠️ API key has incorrect prefix, removing it');
    apiKey = apiKey.substring(1);
  } else {
    console.error('❌ Invalid Firebase API key format. API keys should start with "AIza"');
  }
}

export const firebaseConfig = {
  apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Validate required config values
if (!firebaseConfig.apiKey || !firebaseConfig.apiKey.startsWith('AIza')) {
  console.error('❌ Missing or invalid Firebase API key. Check your .env file.');
}
if (!firebaseConfig.projectId) {
  console.error('❌ Missing Firebase project ID. Check your .env file.');
}
if (!firebaseConfig.authDomain) {
  console.error('❌ Missing Firebase auth domain. Check your .env file.');
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig as import('firebase/app').FirebaseOptions);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
