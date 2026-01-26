import type { ApplicationVerifier } from './auth';

/**
 * Mock ApplicationVerifier that skips reCAPTCHA entirely
 * Use this ONLY for development with test phone numbers
 * 
 * To use test phone numbers:
 * 1. Go to Firebase Console > Authentication > Sign-in method > Phone
 * 2. Add test phone numbers (e.g., +1 650-555-1234 with code 123456)
 * 3. When using a test number, Firebase automatically skips reCAPTCHA
 */
export class MockRecaptchaVerifier implements ApplicationVerifier {
  type = 'recaptcha';

  // Firebase requires this method (can be empty)
  _reset(): void {
    // No-op for mock verifier
  }

  async verify(): Promise<string> {
    // Return empty string - Firebase will detect test numbers and skip reCAPTCHA
    // For real numbers, this won't work - you need the real verifier
    console.warn('Using mock verifier - only works with test phone numbers!');
    return Promise.resolve('');
  }
}
