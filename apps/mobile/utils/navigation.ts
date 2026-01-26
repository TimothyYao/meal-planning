/**
 * Safely navigate back, with fallback to home screen if there's nothing to go back to
 */
export function safeGoBack(navigation: any) {
  if (navigation.canGoBack && navigation.canGoBack()) {
    navigation.goBack();
  } else {
    // Fallback: navigate to MainTabs (home screen)
    navigation.navigate('MainTabs');
  }
}
