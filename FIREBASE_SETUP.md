# Firebase Setup Guide

This guide will help you configure Firebase for authentication and storage in your meal planning app.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Node.js and npm installed
3. For mobile: Expo CLI installed
4. For Apple Sign In: Apple Developer account (for iOS)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard
4. Enable Google Analytics (optional)

## Step 2: Configure Firebase Authentication

### Enable Authentication Providers

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Google** sign-in:
   - Click on Google
   - Enable it
   - Add your app's OAuth client IDs (see below)
   - Save

3. Enable **Apple** sign-in:
   - Click on Apple
   - Enable it
   - Configure OAuth (see Apple setup below)
   - Save

4. Enable **Phone** sign-in (for mobile phone auth):
   - Click on Phone
   - Enable it
   - (Optional) Add test phone numbers for development
   - **Important:** Phone auth (SMS) requires the **Blaze (pay-as-you-go) plan** and billing enabled. See [Phone auth billing](#phone-auth-billing--authbilling-not-enabled) below.
   - Save

### Get Firebase Configuration

**See [FIREBASE_API_KEY.md](./FIREBASE_API_KEY.md) for step‑by‑step instructions on where to find your API key and other config values.**

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the configuration object
5. For mobile, also add iOS and Android apps if needed

## Step 3: Configure OAuth Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Credentials**
4. Create OAuth 2.0 Client IDs:
   - For Web: Add authorized JavaScript origins and redirect URIs
   - For iOS: Add bundle ID (com.mealplanning.mobile)
   - For Android: Add package name and SHA-1 certificate fingerprint
5. Copy the Client IDs

### Apple OAuth Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Sign in with Apple capability
3. Create a Service ID for web authentication
4. Configure redirect URLs
5. Download the private key and note the Key ID and Team ID

## Step 4: Configure Environment Variables

### Mobile App

1. Copy `.env.example` to `.env` in `apps/mobile/`:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```

2. Fill in your Firebase configuration values:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
   EXPO_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id_here
   ```

### Web App

1. Copy `.env.example` to `.env` in `apps/web/`:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

2. Fill in your Firebase configuration values:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Step 5: Configure Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Start in **test mode** for development (or configure security rules)
4. Choose a location for your database

### Security Rules (Production)

Update your Firestore security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 6: iOS Apple Sign In Configuration

For iOS, you need to configure Apple Sign In in your app:

1. In `apps/mobile/app.json`, the `usesAppleSignIn` flag is already set to `true`
2. In Xcode (when building native):
   - Enable "Sign in with Apple" capability
   - Configure your Apple Developer account

## Step 7: Test the Setup

### Mobile

1. Start the Expo development server:
   ```bash
   npm run mobile
   ```

2. Test authentication:
   - Try signing in with Google
   - Try signing in with Apple (iOS only)

### Web

1. Start the development server:
   ```bash
   npm run web
   ```

2. Test authentication in your browser

## Phone Auth Billing (`auth/billing-not-enabled`)

**Firebase Phone Authentication (SMS) requires the Blaze plan and billing enabled.**

If you see `Firebase: Error (auth/billing-not-enabled)` when sending verification codes:

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project
2. Click the **gear icon** → **Usage and billing**
3. Click **Modify plan** (or **Upgrade**)
4. Select **Blaze (pay-as-you-go)**
5. Link a Google Cloud billing account (or create one)
6. Add a payment method

**Costs:** Phone auth has a [free tier](https://firebase.google.com/pricing) (e.g. 10K verifications/month in some regions). You only pay for usage beyond free quotas. Test phone numbers (Firebase Console → Authentication → Phone → Test numbers) do **not** send real SMS and don’t count toward billing.

**Alternatives:** Use **test phone numbers** for development (no billing needed). For production, you must use Blaze + billing.

**See [FIREBASE_AUTH_PRICING.md](./FIREBASE_AUTH_PRICING.md)** for free vs Blaze auth comparison and costs.

---

## Troubleshooting

### Authentication Not Working

- Verify all environment variables are set correctly
- Check Firebase Console that providers are enabled
- Verify OAuth client IDs match your app configuration
- Check browser/device console for error messages

### Firestore Permission Denied

- Check your Firestore security rules
- Ensure the user is authenticated before accessing Firestore
- Verify the user ID matches in the security rules

### Apple Sign In Issues

- Ensure you have an Apple Developer account
- Verify the bundle identifier matches
- Check that "Sign in with Apple" capability is enabled
- For web, ensure Service ID is configured correctly

## Data Structure

The app stores data in Firestore with the following structure:

```
users/
  {userId}/
    foods/
      {foodId}/
        - id, name, brand, barcode, macros, servingSize, servingUnit
    dailyLogs/
      {date}/
        - date, meals[], totalMacros, targetMacros
```

Data is automatically cached locally for offline support and synced when online.

## Next Steps

- Set up Firebase Storage if you need to store images
- Configure Firebase Cloud Functions for server-side logic
- Set up Firebase Analytics for usage tracking
- Configure Firebase Crashlytics for error tracking
