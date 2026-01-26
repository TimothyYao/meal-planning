const store = new Map();

const asyncStorageMock = {
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => asyncStorageMock);
