// Native (iOS/Android): expo-sqlite cung cấp localStorage toàn cục.
import 'expo-sqlite/localStorage/install';

export const storage: Storage = globalThis.localStorage;
