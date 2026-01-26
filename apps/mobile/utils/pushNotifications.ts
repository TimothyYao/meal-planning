import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** EAS project ID (UUID) — required for Expo push tokens. From app.json extra.eas.projectId. */
function getEasProjectId(): string | undefined {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' ? projectId : undefined;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // For silent push notifications (Firebase phone auth), we want to handle them silently
    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

/**
 * Request notification permissions
 * Required for Firebase phone authentication silent push notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // On Android, we need to create a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.LOW, // Low importance for silent notifications
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: undefined, // No sound for silent notifications
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get the Expo push token
 * Uses EAS project ID (UUID from app.json), not Firebase project ID.
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const projectId = getEasProjectId();
    if (!projectId) {
      console.warn(
        'Expo push token: No EAS projectId (extra.eas.projectId in app.json). ' +
          'Push tokens require a development build.'
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Register notification listeners for Firebase phone auth
 * Firebase sends silent push notifications to verify the app
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void
) {
  // Listener for notifications received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received (foreground):', notification);
      // Firebase phone auth sends silent notifications - handle silently
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Listener for user tapping on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification response:', response);
    }
  );

  return {
    remove: () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    },
  };
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
