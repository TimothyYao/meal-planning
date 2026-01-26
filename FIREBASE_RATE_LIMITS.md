# Firebase SMS Rate Limit - How to Fix

If you're seeing `auth/too-many-requests` or SMS rate limiting when trying to sign in, Firebase has temporarily blocked SMS verification for your phone number due to too many attempts.

**SMS rate limits are stricter than general auth limits** - typically only **5-10 SMS codes per hour per phone number**.

## Quick Fixes

### Option 1: Use Test Phone Numbers (BEST for Development) ⭐

**This is the fastest solution and avoids all rate limits!**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Sign-in method** → **Phone**
3. Scroll down to **"Phone numbers for testing"** section
4. Click **"Add phone number"**
5. Enter:
   - **Phone number**: `+1 650-555-1234` (or any number format)
   - **Verification code**: `123456` (any 6-digit code you choose)
6. Click **Save**

**Now use this test number in your app:**
- Enter `+1 650-555-1234` as the phone number
- Click "Send verification code"
- Enter `123456` as the code
- **No SMS is sent, no rate limits, works instantly!**

**See [TEST_PHONE_NUMBERS.md](./TEST_PHONE_NUMBERS.md) for detailed instructions.**

### Option 2: Wait and Retry
- **Wait 1-2 hours** - Firebase SMS rate limits reset automatically
- The limit is typically **5-10 SMS codes per hour per phone number**
- After waiting, try again with your real phone number
For development, use Firebase test phone numbers that don't have rate limits:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Sign-in method** > **Phone**
3. Scroll to **"Phone numbers for testing"**
4. Click **"Add phone number"**
5. Add a test number (e.g., `+1 650-555-1234`) with a test code (e.g., `123456`)
6. Use this test number in your app - it won't hit rate limits!

**See [TEST_PHONE_NUMBERS.md](./TEST_PHONE_NUMBERS.md) for detailed instructions.**

### Option 3: Request Limit Increase (Production)
If you need higher limits for production:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Support** (or contact Firebase support)
3. Request a rate limit increase for your project
4. Explain your use case (e.g., "We have legitimate users who need to authenticate")

## Why This Happens

Firebase has rate limits to prevent abuse:
- **Phone authentication**: ~10-20 requests per hour per phone number
- **SMS verification**: Limited to prevent spam/abuse
- **IP-based limits**: Additional limits per IP address

## Prevention Tips

1. **Use test phone numbers during development** - They don't count toward limits
2. **Don't repeatedly test with the same real phone number** - Use test numbers instead
3. **Implement retry logic** - Show helpful error messages to users
4. **Use other auth methods** - Google/Apple Sign In don't have the same rate limits

## Check Your Current Status

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Users**
3. Check if your phone number is listed
4. If blocked, you'll need to wait for the limit to reset

## For Production Apps

- Implement proper error handling with retry logic
- Show user-friendly messages: "Please wait a few minutes before trying again"
- Consider using other authentication methods (Google, Apple) that have higher limits
- Monitor Firebase usage in the Console to track authentication attempts

## Related Documentation

- [TEST_PHONE_NUMBERS.md](./TEST_PHONE_NUMBERS.md) - Using test phone numbers
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase setup guide
- [FIREBASE_AUTH_PRICING.md](./FIREBASE_AUTH_PRICING.md) - Authentication pricing
