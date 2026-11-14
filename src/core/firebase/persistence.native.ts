import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// Firebase 12 exports this function from its React Native runtime, but its default
// TypeScript declaration entrypoint omits the platform-specific export.
const { getReactNativePersistence } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
};

export const authPersistence = getReactNativePersistence(AsyncStorage);
