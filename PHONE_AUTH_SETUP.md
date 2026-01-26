# Phone Authentication Setup

Phone authentication has been implemented for both mobile and web apps. This guide explains how to use it.

## Features

- ✅ SMS verification code sent to user's phone
- ✅ Two-step authentication flow (send code → verify code)
- ✅ Works on both mobile (iOS/Android) and web
- ✅ Integrated with Firebase Auth
- ✅ User data synced to Firestore after authentication

## Mobile App Usage

### Basic Example

```typescript
import { useAuth } from './contexts/AuthContext';
import type { ConfirmationResult } from 'firebase/auth';

function MyComponent() {
  const { signInWithPhone, verifyPhoneCode, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Step 1: Send verification code
  const handleSendCode = async () => {
    try {
      const result = await signInWithPhone(phoneNumber);
      setConfirmationResult(result);
      // Show code input UI
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (!confirmationResult) return;
    try {
      await verifyPhoneCode(confirmationResult, code);
      // User is now authenticated
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    // Your UI here
  );
}
```

### Phone Number Format

- Phone numbers must include country code
- Format: `+[country code][number]`
- Examples:
  - US: `+1234567890`
  - UK: `+441234567890`
  - India: `+911234567890`

## Web App Usage

The web app includes phone authentication in the main App component. The flow is similar to mobile:

1. Enter phone number
2. Click "Send Code"
3. Enter verification code
4. Click "Verify"

### reCAPTCHA

Web phone authentication requires reCAPTCHA verification. This is automatically handled by the `AuthContext`:

- A reCAPTCHA container is included in the App component
- reCAPTCHA is initialized automatically when the AuthProvider mounts
- The verification is invisible to the user

## Firebase Configuration

### Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Sign-in method**
3. Enable **Phone** authentication
4. Configure test phone numbers (for development) if needed

### Test Phone Numbers (Development)

For testing without sending real SMS:

1. In Firebase Console, go to **Authentication** > **Sign-in method** > **Phone**
2. Add test phone numbers and verification codes
3. Use these during development to avoid SMS costs

Example test configuration:
- Phone: `+1234567890`
- Code: `123456`

## Security Rules

Make sure your Firestore security rules allow authenticated users to access their data:

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

## Error Handling

Common errors and solutions:

### "Invalid phone number format"
- Ensure phone number includes country code with `+` prefix
- Example: `+1234567890` not `1234567890`

### "Invalid verification code"
- Code expires after a few minutes
- Request a new code if expired
- Ensure code is entered correctly (usually 6 digits)

### "SMS quota exceeded"
- Firebase has daily SMS limits on free tier
- Use test phone numbers during development
- Upgrade Firebase plan for production

### "reCAPTCHA verification failed" (Web)
- Ensure reCAPTCHA container exists in DOM
- Check browser console for errors
- Try refreshing the page

## Integration with Existing Code

Phone authentication is fully integrated with the existing storage system:

- Once authenticated, all `storage.ts` functions automatically sync with Firestore
- User data is stored in `users/{userId}/` paths
- Local caching still works for offline support

## Example Component

See `apps/mobile/components/PhoneAuthExample.tsx` for a complete example component that you can use or customize.

## Next Steps

1. Test phone authentication in your app
2. Customize the UI to match your app's design
3. Add phone authentication to your ProfileScreen or create a dedicated auth screen
4. Handle edge cases (expired codes, network errors, etc.)
5. Consider adding phone number as a secondary authentication method
