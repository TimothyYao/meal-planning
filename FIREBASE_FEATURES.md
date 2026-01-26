# Firebase Integration Features

This document outlines the Firebase features that have been integrated into the meal planning app.

## ✅ Implemented Features

### 1. Firebase Authentication
- **Google Sign In**: Available on both mobile and web
- **Apple Sign In**: Available on iOS (native) and web
- **Auth State Management**: Real-time auth state tracking via React Context
- **Automatic Session Management**: Firebase handles token refresh and session persistence

### 2. Firestore Database
- **User Data Storage**: All user data is stored in Firestore with user-specific paths
- **Data Structure**:
  - `users/{userId}/foods/{foodId}` - Food items
  - `users/{userId}/dailyLogs/{date}` - Daily meal logs
- **Real-time Sync**: Data syncs automatically when online
- **Offline Support**: Local caching ensures app works offline

### 3. Local Caching
- **Mobile**: Uses AsyncStorage for local caching
- **Web**: Uses localStorage for local caching
- **Cache Strategy**: 
  - Data is cached locally for offline access
  - Cache is synced to Firestore when online
  - Firestore data takes precedence when available
  - Falls back to cache when offline or Firestore unavailable

### 4. Data Synchronization
- **Automatic Sync**: Changes sync to Firestore automatically
- **Manual Sync**: `syncToFirestore()` function available for manual sync
- **Conflict Resolution**: Firestore data takes precedence (last write wins)
- **Real-time Updates**: Uses Firestore listeners for real-time data updates

## 📁 File Structure

### Mobile App (`apps/mobile/`)
- `config/firebase.ts` - Firebase initialization
- `utils/auth.ts` - Authentication utilities (Google & Apple)
- `utils/firestore.ts` - Firestore operations with caching
- `utils/storage.ts` - Updated to sync with Firestore
- `contexts/AuthContext.tsx` - React context for auth state

### Web App (`apps/web/`)
- `src/config/firebase.ts` - Firebase initialization
- `src/utils/auth.ts` - Authentication utilities (Google & Apple)
- `src/utils/firestore.ts` - Firestore operations with caching
- `src/contexts/AuthContext.tsx` - React context for auth state

## 🔧 Configuration

### Environment Variables Required

#### Mobile
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_APPLE_CLIENT_ID`

#### Web
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 📱 Usage Examples

### Using Authentication

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, loading, signInWithGoogle, signInWithApple, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return (
      <>
        <button onClick={signInWithGoogle}>Sign in with Google</button>
        <button onClick={signInWithApple}>Sign in with Apple</button>
      </>
    );
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Using Firestore Storage

The existing storage functions automatically sync with Firestore when a user is authenticated:

```typescript
import { saveFood, getFoods, getTodayLog } from './utils/storage';

// These functions now automatically sync with Firestore if user is authenticated
await saveFood(foodItem);
const foods = await getFoods();
const todayLog = await getTodayLog();
```

### Manual Sync

```typescript
import { syncToFirestore } from './utils/storage';

// Manually sync local cache to Firestore
await syncToFirestore();
```

## 🔒 Security

### Firestore Security Rules

Make sure to configure Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Next Steps

1. **Set up Firebase project** (see `FIREBASE_SETUP.md`)
2. **Configure environment variables** (copy `.env.example` files)
3. **Enable authentication providers** in Firebase Console
4. **Set up Firestore security rules**
5. **Test authentication flows**
6. **Deploy and test data synchronization**

## 📝 Notes

- Data is stored per-user in Firestore: `users/{userId}/...`
- Local cache is maintained for offline support
- All existing storage functions work the same way, but now sync with Firestore
- The app gracefully falls back to local storage when offline or not authenticated
- Real-time updates are available via Firestore listeners (see `firestore.ts`)
