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
