// This file runs before test framework is installed
// Mock PixelRatio module directly
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => Math.round(size * 2)),
    roundToNearestPixel: jest.fn((size) => Math.round(size * 2) / 2),
    startDetecting: jest.fn(),
  },
}));

// Mock Dimensions module
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
