# Meal Planning Monorepo

A comprehensive meal planning and macro tracking application with mobile and web components, featuring Firebase authentication, real-time data sync, and offline support.

## Overview

This monorepo contains a full-stack meal planning application that helps users track their daily nutrition, plan meals, and achieve their macro goals. The app supports multiple authentication methods, real-time data synchronization with Firebase, and works offline with local caching.

## Features

### ✅ Implemented Features

#### Authentication
- **Google Sign In**: Available on both mobile and web
- **Apple Sign In**: Native iOS support and web support
- **Phone Authentication**: SMS-based verification for mobile and web
- **Session Management**: Automatic token refresh and persistent sessions

#### Food Tracking
- **Add Custom Foods**: Create food items with custom macros and serving sizes
- **Daily Log Tracking**: Track meals and foods consumed throughout the day
- **Macro Calculation**: Automatic calculation of calories, protein, carbs, and fat
- **Calendar Navigation**: Navigate between dates to view past logs
- **Food Management**: Edit and delete food items with swipe gestures

#### Data Management
- **Firestore Integration**: Real-time data synchronization with Firebase Firestore
- **Offline Support**: Local caching with AsyncStorage (mobile) and localStorage (web)
- **Automatic Sync**: Changes sync to Firestore when online
- **User-Specific Data**: All data is stored per-user in Firestore

#### User Interface
- **Mobile App**: Native iOS and Android experience with React Native
- **Web Dashboard**: Responsive web interface for planning and analytics
- **Progress Tracking**: Visual progress bars for macro goals
- **Intuitive Navigation**: Tab-based navigation with modal screens

## Structure

```
.
├── apps/
│   ├── mobile/          # Expo React Native app (iOS & Android)
│   │   ├── components/  # Reusable UI components
│   │   ├── screens/     # App screens (Home, Add Food, Profile, etc.)
│   │   ├── contexts/    # React contexts (Auth, etc.)
│   │   ├── utils/       # Utilities (auth, firestore, storage)
│   │   └── config/      # Configuration files
│   └── web/             # Web dashboard (Vite + React)
│       └── src/
│           ├── contexts/ # React contexts
│           ├── utils/    # Utilities
│           └── config/   # Configuration files
├── packages/
│   └── shared/          # Shared types, utilities, API clients
├── doc/                  # Documentation (architecture, user stories, etc.)
└── package.json           # Root workspace configuration
```

## Prerequisites

- **Node.js**: 18+ (20.19+ recommended for Vite)
- **npm**: 9+
- **Firebase Account**: For authentication and data storage
- **For Mobile Development**:
  - Expo Go app (iOS/Android) for development
  - iOS: Xcode and CocoaPods (for native builds)
  - Android: Android Studio (for native builds)
- **For Apple Sign In**: Apple Developer account (for iOS)

## Setup

### 1. Install Dependencies

```bash
npm install
cd packages/shared && npm run build
```

### 2. Firebase Configuration

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication and Firestore Database

2. **Configure Authentication Providers**:
   - Enable Google Sign In
   - Enable Apple Sign In (for iOS/web)
   - Enable Phone Sign In (requires Blaze plan for SMS)

3. **Get Firebase Configuration**:
   - Navigate to Project Settings > General in Firebase Console
   - Copy the Firebase SDK configuration object for your apps

### 3. Environment Variables

#### Mobile App (`apps/mobile/.env`)

Create `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id
EXPO_PUBLIC_SKIP_RECAPTCHA=false
```

#### Web App (`apps/web/.env`)

Create `.env` file in `apps/web/`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore Security Rules

Configure Firestore security rules in Firebase Console:

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

## Development

```bash
# Mobile app (Expo development server)
npm run mobile
# or
npm run ios      # iOS simulator
npm run android  # Android emulator

# Web dashboard (http://localhost:5173)
npm run web

# Shared package watch mode
cd packages/shared && npm run dev
```

## Building

```bash
# Build shared package first
cd packages/shared && npm run build

# Build mobile app
npm run build:mobile

# Build web app
npm run build:web
```

## Workspaces

### `apps/mobile`

React Native app built with Expo for iOS and Android.

- **Tech Stack**: React Native, Expo (~54.0), TypeScript, React Navigation
- **Key Features**:
  - Firebase Authentication (Google, Apple, Phone)
  - Firestore integration with offline caching
  - Food tracking and daily logs
  - Calendar navigation
  - Swipe gestures for food management
- **Run**: `npm run mobile` or `cd apps/mobile && npm start`
- **Screens**: Home, Add Food, Edit Food, Food Detail, Profile, Phone Auth

### `apps/web`

Web dashboard for planning and analytics.

- **Tech Stack**: Vite, React 19, TypeScript
- **Key Features**:
  - Firebase Authentication (Google, Apple, Phone)
  - Firestore integration
  - Responsive design
- **Run**: `npm run web` or `cd apps/web && npm run dev`
- **Port**: http://localhost:5173

### `packages/shared`

Shared TypeScript types and utilities used by both apps.

- **Tech**: TypeScript (ES modules)
- **Exports**:
  - Types: `MacroTargets`, `FoodItem`, `Meal`, `DailyLog`, `UserProfile`, `MealFood`
  - Utilities: `formatMacroValue`, `calculateMacros`
- **Build**: `npm run build` or `npm run dev` (watch mode)

## Usage

### Importing from Shared Package

```typescript
import type { MacroTargets, FoodItem, DailyLog } from '@meal-planning/shared';
import { formatMacroValue, calculateMacros } from '@meal-planning/shared';

const targets: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};
```

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

The storage functions automatically sync with Firestore when a user is authenticated:

```typescript
import { saveFood, getFoods, getTodayLog } from './utils/storage';

// These functions automatically sync with Firestore if user is authenticated
await saveFood(foodItem);
const foods = await getFoods();
const todayLog = await getTodayLog();
```

## Development Workflow

1. **Edit shared package**: Make changes in `packages/shared/src/`
2. **Rebuild**: `cd packages/shared && npm run build` or use watch mode: `npm run dev`
3. **Import changes**: TypeScript will pick up updates automatically in apps
4. **Test**: Run mobile or web app to test changes

## Documentation

- **[doc/architecture.md](./doc/architecture.md)**: Technical architecture
- **[doc/data-models.md](./doc/data-models.md)**: Data models and entities
- **[doc/vision.md](./doc/vision.md)**: Product vision and roadmap

## Troubleshooting

**Blank page or import errors**: 
- Ensure the shared package is built: `cd packages/shared && npm run build`
- Verify `packages/shared/dist/` exists

**Module resolution issues**: 
- Reinstall dependencies from root: `npm install`

**Firebase authentication errors**:
- Verify environment variables are set correctly
- Check Firebase Console for enabled authentication providers

**Phone authentication not working**:
- Phone auth requires Firebase Blaze plan (pay-as-you-go)
- Ensure phone authentication is enabled in Firebase Console

**Firestore sync issues**:
- Check Firestore security rules
- Verify user is authenticated

## Tech Stack

- **Mobile**: React Native + Expo (~54.0) + TypeScript + React Navigation
- **Web**: Vite + React 19 + TypeScript
- **Backend**: Firebase (Authentication, Firestore)
- **Shared**: TypeScript (ES modules)
- **Monorepo**: npm workspaces
- **State Management**: React Context API
- **Storage**: AsyncStorage (mobile), localStorage (web), Firestore

## License

MIT - See [LICENSE](./LICENSE) file for details
