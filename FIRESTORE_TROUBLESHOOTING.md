# Firestore Permissions Troubleshooting

## Current Issue: "Missing or insufficient permissions"

Even though the user is authenticated (userId: `p18HfOOgOeU5FuOPrmoLZN12wmk1`), Firestore is denying access.

## Solution: Verify Security Rules

### Step 1: Check Current Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Verify the rules match exactly what's below

### Step 2: Use These Exact Rules

Copy and paste these rules **exactly** (no modifications):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      match /dailyLogs/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /foods/{foodId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Step 3: Publish the Rules

1. Click **"Publish"** button (NOT just "Validate")
2. Wait for "Published successfully" message
3. Wait 10-30 seconds for rules to propagate

### Step 4: Verify Rules Are Active

1. Check the Rules tab shows "Published" (not "Draft")
2. The timestamp should show when rules were last published
3. Try accessing data in the app again

## Debugging Steps

### Check Authentication

The logs show:
- ✅ User is authenticated: `userId: "p18HfOOgOeU5FuOPrmoLZN12wmk1"`
- ✅ Auth token exists: `hasAuthToken: true`
- ❌ Permission denied on path: `users/p18HfOOgOeU5FuOPrmoLZN12wmk1/dailyLogs/2026-01-25`

### Verify User ID Match

1. Go to Firebase Console → **Authentication** → **Users**
2. Find the user with UID: `p18HfOOgOeU5FuOPrmoLZN12wmk1`
3. Verify this matches the user signed into the app

### Test Rules Manually

1. In Firebase Console → Firestore Database → **Rules**
2. Click **"Rules Playground"**
3. Set:
   - Location: `users/p18HfOOgOeU5FuOPrmoLZN12wmk1/dailyLogs/2026-01-25`
   - Authenticated: Yes
   - User ID: `p18HfOOgOeU5FuOPrmoLZN12wmk1`
   - Operation: Read
4. Click **"Run"** - should show "Allow"

## Common Issues

### Issue 1: Rules Not Published
- **Symptom**: Rules show as "Draft" or have unsaved changes
- **Fix**: Click "Publish" and wait for confirmation

### Issue 2: Rules Syntax Error
- **Symptom**: Rules show validation errors
- **Fix**: Copy the exact rules above, check for typos

### Issue 3: User ID Mismatch
- **Symptom**: User authenticated but ID doesn't match path
- **Fix**: Verify `request.auth.uid == userId` in rules matches actual user ID

### Issue 4: Rules Propagation Delay
- **Symptom**: Rules published but still getting errors
- **Fix**: Wait 30-60 seconds, restart the app

## Alternative: Temporary Test Rules

If you need to test quickly, temporarily use these more permissive rules (ONLY for testing):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: These rules allow any authenticated user to access any user's data. Only use for testing, then revert to the secure rules above.

## After Fixing

Once rules are published correctly:
1. The app will automatically retry Firestore requests
2. Data will sync from local cache to Firestore
3. New data will be saved to Firestore successfully

The app has offline support, so it will continue working with local cache even if Firestore fails.
