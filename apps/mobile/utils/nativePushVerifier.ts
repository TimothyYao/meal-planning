import type { ApplicationVerifier } from './auth';
import { areNotificationsEnabled } from './pushNotifications';

/**
 * Native Push ApplicationVerifier
 * 
 * This verifier tells Firebase to use silent push notifications for app verification
 * instead of reCAPTCHA. This works on real devices with notification permissions.
 * 
 * Firebase will automatically use silent push if:
 * - Notification permissions are granted
 * - Device has background refresh enabled (iOS)
 * - APNs/FCM is properly configured
 * 
 * If silent push fails, Firebase will fall back to reCAPTCHA automatically.
 */
export class NativePushVerifier implements ApplicationVerifier {
  type = 'recaptcha'; // Firebase expects this type

  // Firebase requires this method
  _reset(): void {
    // No-op - native push doesn't need reset
  }

  async verify(): Promise<string> {
    // Check if notifications are enabled
    const hasNotifications = await areNotificationsEnabled();
    
    if (!hasNotifications) {
      throw new Error(
        'Notification permissions required for phone authentication. ' +
        'Please enable notifications in Settings.'
      );
    }

    // Return empty string - Firebase will detect this and use silent push
    // The actual verification happens via silent push notification
    // Firebase handles this automatically on the native side
    console.log('Using native push verification (silent push)');
    
    // Return a promise that resolves immediately
    // Firebase will use silent push notifications in the background
    return Promise.resolve('');
  }
}
