module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  setupFiles: ['./jest.setupBefore.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  clearMocks: true,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@meal-planning/shared)',
  ],
  moduleNameMapper: {
    '^@meal-planning/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'storage/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
