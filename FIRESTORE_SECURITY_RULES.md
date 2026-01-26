# Firestore Security Rules for Production

## Recommended Security Rules

Copy and paste these rules into Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      // Daily logs collection - documents at users/{userId}/dailyLogs/{date}
      match /dailyLogs/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Foods collection - documents at users/{userId}/foods/{foodId}
      match /foods/{foodId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Verification Steps

1. **Publish the Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Paste the rules above
   - Click **"Publish"** (not just "Validate")
   - Wait for the "Published successfully" message

2. **Verify User Authentication:**
   - Make sure the user is signed in before accessing Firestore
   - Check the app logs to confirm `getCurrentUser()` returns a user

3. **Test the Rules:**
   - After publishing, try accessing data in the app
   - Check Firebase Console → Firestore Database → Data to see if documents are created

## Troubleshooting

### "Missing or insufficient permissions" Error

**Possible causes:**
1. Rules not published - Make sure you clicked "Publish", not just saved as draft
2. User not authenticated - Verify `request.auth != null` is true
3. User ID mismatch - Verify `request.auth.uid == userId` matches

**Debug steps:**
1. Check Firebase Console → Authentication → Users to verify the user exists
2. Check the user's UID matches the document path (`users/{userId}/...`)
3. Temporarily add a more permissive rule to test:
   ```javascript
   match /users/{userId}/{document=**} {
     allow read, write: if request.auth != null;
   }
   ```
   (Then revert to the secure version once confirmed)

### Rules Not Taking Effect

- Rules can take a few seconds to propagate
- Try refreshing the app or waiting 10-30 seconds after publishing
- Clear app cache if using Expo Go

## Alternative: More Explicit Rules

If the wildcard rules don't work, use explicit paths:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Daily logs collection
      match /dailyLogs/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Foods collection
      match /foods/{foodId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
