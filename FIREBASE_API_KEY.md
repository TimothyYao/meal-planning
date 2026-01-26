# Where to Get Your Firebase API Key & Config

Use these values in **Environment variables** (see below). Never commit real keys to git.

---

## 1. Open Firebase Console

Go to **[Firebase Console](https://console.firebase.google.com/)** and sign in.

---

## 2. Create or Select a Project

- **New project:** Click **“Add project”** → name it → (optional) disable Analytics → **Create**.
- **Existing project:** Click your project in the overview.

---

## 3. Register Your App(s)

### Web app (for `apps/web` and for reCAPTCHA)

1. In Project Overview, click the **Web** icon `</>`.
2. **App nickname:** e.g. `meal-planning-web`.
3. **(Optional)** Check “Firebase Hosting” if you use it.
4. Click **Register app**.
5. You’ll see a config object like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

Copy these values.

### iOS / Android (for `apps/mobile`)

1. Click the **iOS** or **Android** icon in Project Overview.
2. Enter **iOS bundle ID** or **Android package name** (e.g. `com.mealplanning.mobile`).
3. Follow the steps; you can skip “Add Firebase SDK” and “Add initialization code” if you’re using env vars.

The **API key and other config** are the same as for the web app. Use the **Web** config for the mobile app’s env vars.

---

## 4. Get the Config Values

From the **Web** app config (or the same project’s **Project settings**):

| Variable | Where it comes from |
|----------|---------------------|
| **API Key** | `apiKey` in the config |
| **Auth Domain** | `authDomain` |
| **Project ID** | `projectId` |
| **Storage Bucket** | `storageBucket` |
| **Messaging Sender ID** | `messagingSenderId` |
| **App ID** | `appId` |

- **API Key:** In [Firebase Console](https://console.firebase.google.com/) → **Project settings** (gear) → **Your apps** → your Web app → **Config** → `apiKey`.
- **Project ID:** Same **Config** block, or **Project settings** → **General** → **Project ID**.

---

## 5. Set Environment Variables

### Mobile (`apps/mobile`)

1. Copy the example file:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```
2. Edit `apps/mobile/.env` and fill in:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Use the **exact** values from the Firebase Web app config.

### Web (`apps/web`)

1. Copy the example file:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```
2. Edit `apps/web/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 6. Enable Phone Auth

1. In Firebase Console → **Build** → **Authentication**.
2. Open **Sign-in method**.
3. Enable **Phone**.
4. (Optional) Add **test phone numbers** for development.

---

## 7. Optional: Restrict API Key (Production)

The Web API key is meant to be used in client-side code, but you can tighten usage:

1. [Google Cloud Console](https://console.cloud.google.com/) → same project as Firebase.
2. **APIs & Services** → **Credentials**.
3. Open the **Web** API key used by Firebase.
4. Under **Application restrictions**, limit to your **HTTP referrers** (e.g. `https://yourdomain.com/*`) or **Android/iOS** apps.

---

## Summary

| What | Where |
|------|--------|
| **Firebase Console** | [console.firebase.google.com](https://console.firebase.google.com/) |
| **API Key & config** | Project → Project settings → Your apps → Web app → Config |
| **Phone auth** | Authentication → Sign-in method → Phone → Enable |
| **Env file (mobile)** | `apps/mobile/.env` (`EXPO_PUBLIC_*`) |
| **Env file (web)** | `apps/web/.env` (`VITE_*`) |

Once these are set, the mobile app’s **Phone auth** and **Firebase** features will use your project.
