// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Dimensions at jest.setup level as well
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  __esModule: true,
  default: {
    get: jest.fn((dim) => {
      const data = {
        window: { width: 375, height: 812, scale: 2, fontScale: 1 },
        screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
      };
      return data[dim] || data.window;
    }),
    set: jest.fn(),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

const mockStore = new Map();

const mockAsyncStorage = {
  setItem: jest.fn((key, value) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) =>
    Promise.resolve(mockStore.has(key) ? mockStore.get(key) : null)
  ),
  removeItem: jest.fn((key) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStore.clear();
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((component) => component),
    Directions: {},
  };
});

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock utils/auth
jest.mock('./utils/auth', () => ({
  getCurrentUser: jest.fn(() => null),
}));

// Mock utils/firestore - used by storage tests that don't want real firestore calls
// Note: firestore.integration.test.ts will unmock this and use its own mocks
jest.mock('./utils/firestore', () => ({
  saveDailyLogToFirestore: jest.fn(() => Promise.resolve()),
  getDailyLogFromFirestore: jest.fn(() => Promise.resolve(null)),
  getUserProfileFromFirestore: jest.fn(() => Promise.resolve(null)),
  saveFoodToFirestore: jest.fn(() => Promise.resolve()),
  getFoodsFromFirestore: jest.fn(() => Promise.resolve([])),
  getFoodByIdFromFirestore: jest.fn(() => Promise.resolve(null)),
  deleteFoodFromFirestore: jest.fn(() => Promise.resolve()),
  syncLocalCacheToFirestore: jest.fn(() => Promise.resolve()),
}));

// Mock AuthContext
jest.mock('./contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    signInWithPhone: jest.fn(),
    verifyPhoneCode: jest.fn(),
    signOut: jest.fn(),
  })),
  AuthProvider: ({ children }) => children,
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }) => children,
}));

// Mock Alert
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// Export the mock store for tests to access
global.mockAsyncStorageStore = mockStore;

// Silence console logs during tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
