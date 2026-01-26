# Skip reCAPTCHA with Test Phone Numbers

Firebase allows you to use **test phone numbers** that skip reCAPTCHA verification. This is perfect for development!

## Setup Test Phone Numbers

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Sign-in method**
3. Click on **Phone**
4. Scroll down to **Phone numbers for testing**
5. Click **Add phone number**
6. Add test numbers with verification codes:
   - **Phone number**: `+1 650-555-1234` (or any number)
   - **Verification code**: `123456` (any 6-digit code)
7. Click **Save**

## How It Works

- When you use a test phone number, Firebase **automatically skips reCAPTCHA**
- You'll receive the test verification code you configured (not a real SMS)
- No reCAPTCHA modal will appear
- Works instantly for development

## Example Test Numbers

You can add multiple test numbers:

| Phone Number | Verification Code | Notes |
|-------------|------------------|-------|
| `+1 650-555-1234` | `123456` | US test number |
| `+1 650-555-5678` | `654321` | Another US test |
| `+44 20 7946 0958` | `111111` | UK test number |

## Using Test Numbers in Your App

1. Enter a test phone number (e.g., `+1 650-555-1234`)
2. Click "Send verification code"
3. **No reCAPTCHA will appear** (Firebase detects it's a test number)
4. Enter the verification code you configured (e.g., `123456`)
5. You're signed in!

## Production

- Test phone numbers **only work in development/test environments**
- For production, real phone numbers require reCAPTCHA (security requirement)
- Remove test numbers before going to production

## Benefits

✅ No reCAPTCHA needed during development  
✅ Instant verification (no waiting for SMS)  
✅ No SMS costs  
✅ Works offline (no network needed for test numbers)  
✅ Perfect for automated testing
