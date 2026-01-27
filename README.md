# Meal Planning Monorepo

A comprehensive meal planning and macro tracking application with mobile and web components, featuring Firebase authentication, food database integration, real-time data sync, and offline support.

## Overview

This monorepo contains a full-stack meal planning application that helps users track their daily nutrition, plan meals, and achieve their macro goals. The app supports multiple authentication methods, food search via USDA and Open Food Facts APIs, real-time data synchronization with Firebase, and works offline with local caching.

## Features

### ✅ Implemented Features

#### Authentication
- **Google Sign In**: Available on both mobile and web
- **Apple Sign In**: Native iOS support and web support
- **Phone Authentication**: SMS-based verification for mobile and web with reCAPTCHA
- **Session Management**: Automatic token refresh and persistent sessions

#### Food Tracking
- **Add Custom Foods**: Create food items with custom macros and serving sizes
- **Daily Log Tracking**: Track meals and foods consumed throughout the day
- **Macro Calculation**: Automatic calculation of calories, protein, carbs, and fat (with calorie calculation from macros: 4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
- **Calendar Navigation**: Navigate between dates to view past logs
- **Food Management**: Edit and delete food items with swipe gestures
- **Reorder Foods**: Reorder foods within meals via drag gestures

#### Food Database Integration
- **USDA FoodData Central**: Search the comprehensive USDA nutrition database (requires API key)
- **Open Food Facts**: Search the open-source food database with barcode support (no API key required)
- **Smart Caching**: Search results are cached locally to reduce API calls and improve performance
- **Rate Limiting**: Built-in rate limiting to respect API usage limits
- **Auto-Save**: Foods from external databases are automatically saved to your history when added

#### Data Management
- **Firestore Integration**: Real-time data synchronization with Firebase Firestore
- **Offline Support**: Local caching with AsyncStorage (mobile) and localStorage (web)
- **Automatic Sync**: Changes sync to Firestore when online
- **User-Specific Data**: All data is stored per-user in Firestore
- **Data Serialization**: Proper handling of Date objects for storage and retrieval

#### User Interface
- **Mobile App**: Native iOS and Android experience with React Native
- **Web Dashboard**: Responsive web interface for planning and analytics
- **Progress Tracking**: Visual progress bars for macro goals
- **Intuitive Navigation**: Tab-based navigation with modal screens
- **Design Tokens**: Consistent design system with centralized spacing, colors, and typography

## Structure

```
.
├── apps/
│   ├── mobile/              # Expo React Native app (iOS & Android)
│   │   ├── __tests__/       # Jest tests for components and storage
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens (Home, Add Food, Search, Profile, etc.)
│   │   ├── contexts/        # React contexts (Auth, etc.)
│   │   ├── storage/         # Storage functions with Firestore sync
│   │   ├── utils/           # Utilities (auth, firestore, APIs, caching)
│   │   └── config/          # Configuration files
│   └── web/                 # Web dashboard (Vite + React)
│       └── src/
│           ├── contexts/    # React contexts
│           ├── utils/       # Utilities
│           └── config/      # Configuration files
├── packages/
│   └── shared/              # Shared types, utilities, design tokens
│       └── src/
│           ├── index.ts     # Types and utility functions
│           └── tokens.ts    # Design tokens (spacing, colors, typography)
├── doc/                     # Documentation (architecture, user stories, etc.)
├── .github/
│   └── workflows/           # GitHub Actions (CI/CD, EAS updates)
└── package.json             # Root workspace configuration
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
# Firebase Configuration (required)
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# OAuth Configuration (required for social sign-in)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id

# Phone Auth Configuration
EXPO_PUBLIC_SKIP_RECAPTCHA=false

# Food Database API (optional - enables USDA search)
EXPO_PUBLIC_USDA_API_KEY=your_usda_api_key
```

**Note**: The USDA API key is optional. If not provided, the app will use Open Food Facts (which requires no API key) for food search. Get a free USDA API key at [https://fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html).

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

## Testing

```bash
# Run mobile app tests
cd apps/mobile && npm test

# Run tests in watch mode
cd apps/mobile && npm test -- --watch

# Run specific test file
cd apps/mobile && npm test -- CalendarPicker.test.tsx
```

The test suite includes:
- Component tests (CalendarPicker, FoodForm, FoodItem, etc.)
- Storage function tests (foods, dailyLogs, macros, utils)
- Integration tests for Firestore operations

## Building

```bash
# Build shared package first
cd packages/shared && npm run build

# Build mobile app
npm run build:mobile

# Build web app
npm run build:web
```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **Test Job**: Runs on every push to any branch
  - Installs dependencies
  - Runs the full test suite

- **EAS Update Job**: Runs on push to `main` branch (after tests pass)
  - Validates required secrets
  - Creates an EAS update for the production branch

Required GitHub Secrets for deployment:
- `EXPO_TOKEN`: Your Expo access token
- `EXPO_PUBLIC_FIREBASE_*`: Firebase configuration values

## Workspaces

### `apps/mobile`

React Native app built with Expo for iOS and Android.

- **Tech Stack**: React Native 0.81.5, Expo ~54.0, React 19.1, TypeScript, React Navigation 7.x
- **Key Features**:
  - Firebase Authentication (Google, Apple, Phone with reCAPTCHA)
  - Firestore integration with offline caching
  - Food tracking and daily logs
  - USDA and Open Food Facts API integration
  - Calendar navigation
  - Swipe gestures for food management
  - Push notifications support
- **Run**: `npm run mobile` or `cd apps/mobile && npm start`
- **Test**: `cd apps/mobile && npm test`
- **Screens**: Home, Add Food, Edit Food, Food Detail, Search Food, Profile, Phone Auth, Add Food Menu
- **Components**: CalendarPicker, CountryCodePicker, FloatingAddMenu, FoodDetail, FoodForm, FoodItem, MacroAmountPicker, NumberEditor, ServingSizePicker

### `apps/web`

Web dashboard for planning and analytics.

- **Tech Stack**: Vite 7.x, React 19.2, TypeScript
- **Key Features**:
  - Firebase Authentication (Google, Apple, Phone)
  - Firestore integration
  - Responsive design
- **Run**: `npm run web` or `cd apps/web && npm run dev`
- **Port**: http://localhost:5173

### `packages/shared`

Shared TypeScript types, utilities, and design tokens used by both apps.

- **Tech**: TypeScript (ES modules)
- **Exports**:
  - **Types**: `MacroTargets`, `FoodItem`, `Meal`, `DailyLog`, `UserProfile`, `MealFood`, `AuthUser`, `StorageAdapter`
  - **Utilities**: `formatMacroValue`, `calculateMacros`, `calculateCaloriesFromMacros`, `convertFirebaseUser`, `serializeDailyLog`, `deserializeDailyLog`
  - **Design Tokens**: `spacing`, `fontSize`, `fontColor`, `colors`
- **Build**: `npm run build` or `npm run dev` (watch mode)

## Usage

### Importing from Shared Package

```typescript
import type { MacroTargets, FoodItem, DailyLog } from '@meal-planning/shared';
import { formatMacroValue, calculateMacros, calculateCaloriesFromMacros } from '@meal-planning/shared';
import { spacing, fontSize, fontColor, colors } from '@meal-planning/shared';

const targets: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

// Calculate calories from macros (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
const calculatedCalories = calculateCaloriesFromMacros(150, 200, 65); // 1985

// Use design tokens for consistent styling
const style = {
  padding: spacing.md,      // 12
  fontSize: fontSize.base,  // 16
  color: fontColor.primary, // '#000000'
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

### Using Storage Functions

The storage functions automatically sync with Firestore when a user is authenticated:

```typescript
import { 
  saveFood, 
  getFoods, 
  getTodayLog, 
  addFoodToToday,
  getLogForDate,
  removeFoodFromDate 
} from './storage';

// Save a custom food
await saveFood(foodItem);

// Get all saved foods
const foods = await getFoods();

// Get today's log
const todayLog = await getTodayLog();

// Add food to today's log with quantity
await addFoodToToday(food, 1.5); // 1.5 servings

// Get log for a specific date
const pastLog = await getLogForDate('2024-01-15');
```

### Using Food Database APIs

```typescript
import { searchAndConvertOFFProducts } from './utils/offApi';
import { searchUSDAFoods, convertUSDAToFoodItem, isUSDAAvailable } from './utils/usdaApi';

// Search Open Food Facts (no API key required)
const offFoods = await searchAndConvertOFFProducts('chicken breast', 1, 20);

// Search USDA (requires API key)
if (isUSDAAvailable()) {
  const response = await searchUSDAFoods('chicken breast', 1, 20);
  const usdaFoods = await Promise.all(response.foods.map(convertUSDAToFoodItem));
}
```

## Development Workflow

1. **Edit shared package**: Make changes in `packages/shared/src/`
2. **Rebuild**: `cd packages/shared && npm run build` or use watch mode: `npm run dev`
3. **Import changes**: TypeScript will pick up updates automatically in apps
4. **Test**: Run mobile or web app to test changes

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
- Check reCAPTCHA configuration for web

**Firestore sync issues**:
- Check Firestore security rules
- Verify user is authenticated

**USDA search not working**:
- Verify `EXPO_PUBLIC_USDA_API_KEY` is set in `.env`
- Get a free API key at [https://fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
- The app will fall back to Open Food Facts if USDA is unavailable

**Open Food Facts rate limiting**:
- The API has rate limits (10 requests/minute for search)
- Built-in rate limiting and caching help avoid hitting limits
- Wait a few seconds between searches if you see warnings

**Tests failing**:
- Ensure all dependencies are installed: `npm install`
- Check that mocks are properly configured in `jest.setup.js`
- Run tests with `--verbose` for more details: `npm test -- --verbose`

**EAS Update failing in CI**:
- Verify all required secrets are set in GitHub repository settings
- Check that `EXPO_TOKEN` is valid and not expired

## Tech Stack

- **Mobile**: React Native 0.81.5 + Expo ~54.0 + React 19.1 + TypeScript + React Navigation 7.x
- **Web**: Vite 7.x + React 19.2 + TypeScript
- **Backend**: Firebase (Authentication, Firestore)
- **Food APIs**: USDA FoodData Central, Open Food Facts
- **Shared**: TypeScript (ES modules) with design tokens
- **Monorepo**: npm workspaces
- **State Management**: React Context API
- **Storage**: AsyncStorage (mobile), localStorage (web), Firestore
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions + EAS Update
- **Code Quality**: ESLint + Prettier

## Documentation

- **[doc/architecture.md](./doc/architecture.md)**: Technical architecture and future considerations
- **[doc/data-models.md](./doc/data-models.md)**: Data models and entities
- **[doc/design-system.md](./doc/design-system.md)**: Design tokens and UI guidelines
- **[doc/vision.md](./doc/vision.md)**: Product vision and roadmap
- **[doc/user-stories/](./doc/user-stories/)**: User stories organized by feature

## License

MIT - See [LICENSE](./LICENSE) file for details
