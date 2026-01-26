# Firebase Storage Setup for Profile Pictures

This guide helps you set up Firebase Storage for profile picture uploads.

## Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Get started** (if not already enabled)
5. Choose **Start in test mode** for development (or **Start in production mode** for production)
6. Select a storage location (same region as your Firestore is recommended)
7. Click **Done**

## Step 2: Configure Storage Security Rules

Go to **Storage** → **Rules** tab and update the rules:

### For Development (Test Mode):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images: users can only upload/read their own profile picture
    // Path format: users/{userId}/profile.jpg (matches Firestore structure)
    match /users/{userId}/profile.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow all reads/writes for testing (remove in production!)
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### For Production:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images: users can only upload/read their own profile picture
    // Path format: users/{userId}/profile.jpg (matches Firestore structure)
    match /users/{userId}/profile.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Note:** This structure matches your Firestore pattern (`users/{userId}/...`) and allows the Storage rules to directly verify that the `userId` in the path matches the authenticated user's UID.

**Important:** Click **Publish** after updating the rules!

## Step 3: Verify Storage Bucket Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Check that `storageBucket` is set correctly (e.g., `your-project.appspot.com`)
4. Verify this matches your `.env` file:
   ```
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

## Step 4: Test the Upload

1. Sign in to your app
2. Go to Profile screen
3. Tap the profile picture
4. Select an image
5. The image should upload successfully

## Troubleshooting

### Error: "storage/unauthorized"
- **Cause**: Storage security rules don't allow the operation
- **Fix**: Update Storage rules (see Step 2) and click **Publish**

### Error: "storage/unknown"
- **Cause**: Storage not enabled, bucket misconfigured, or rules issue
- **Fix**: 
  1. Verify Storage is enabled in Firebase Console
  2. Check `storageBucket` in your `.env` file matches Firebase Console
  3. Verify security rules are published
  4. Check that you're authenticated (signed in)

### Error: "storage/quota-exceeded"
- **Cause**: Firebase Storage quota exceeded
- **Fix**: Upgrade to Blaze plan or check usage in Firebase Console

### Image Not Appearing After Upload
- **Cause**: CORS issue or image URL not saved
- **Fix**: 
  1. Check browser/device console for errors
  2. Verify the image URL is saved in AsyncStorage
  3. Check Firebase Storage → Files to see if image was uploaded

## Storage Costs

Firebase Storage has a free tier:
- **Storage**: 5 GB free
- **Downloads**: 1 GB/day free
- **Uploads**: 20,000 operations/day free

For most apps, profile pictures won't exceed the free tier.

## Related Documentation

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - General Firebase setup
