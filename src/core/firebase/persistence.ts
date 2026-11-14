import { browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';

// Browser auth survives reloads. Firebase falls back to localStorage when IndexedDB is unavailable.
export const authPersistence = [indexedDBLocalPersistence, browserLocalPersistence];
