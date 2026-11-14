import { FirebaseError, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  beforeAuthStateChanged,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  documentId,
  getDocsFromServer,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  type Firestore,
  type Query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { AI_CONSENT_VERSION } from '../../types/ai';
import {
  claimSyncOwner,
  getSetting,
  listSyncTransactions,
  markSynced,
  mergeRemoteTransactions,
  setSetting,
} from '../database/repository';
import { authPersistence } from './persistence';
import {
  fromCloudTransaction,
  localWins,
  toCloudTransaction,
  validateCloudTransaction,
  type CloudTransaction,
} from './transactionDto';

// Expo only inlines statically referenced EXPO_PUBLIC_ variables. These are public app identifiers, not secrets.
const options: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
const APP_NAME = 'kesefly';
const WRITE_BATCH_SIZE = 25;
const READ_PAGE_SIZE = 100;
let services: { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions } | null = null;
let authGeneration = 0;
let authTransitions = 0;
const revokedAIConsent = new Set<string>();

export interface FirebaseAISession { uid: string; generation: number }

function emulatorEndpoint(value: string | undefined, port: number): { host: string; port: number } {
  const match = /^(localhost|127\.0\.0\.1|\[::1\]):([0-9]{1,5})$/.exec(value ?? `127.0.0.1:${port}`);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535) throw new Error('AI_CONFIGURATION');
  return { host: match[1] === '[::1]' ? '::1' : match[1], port: Number(match[2]) };
}

function cloudConfiguration() {
  const region = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? 'asia-southeast1';
  // getFunctions also accepts arbitrary domains. Only permit a Firebase region here.
  if (!/^[a-z]+-[a-z]+\d$/.test(region)) throw new Error('AI_CONFIGURATION');
  const emulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ? {
    auth: emulatorEndpoint(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, 9099),
    firestore: emulatorEndpoint(process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST, 8080),
    functions: emulatorEndpoint(process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST, 5001),
  } : null;
  return { region, emulators };
}

export function isCloudAIConfigured(): boolean {
  if (!isFirebaseConfigured()) return false;
  try { cloudConfiguration(); return true; } catch { return false; }
}
let activeSync: Promise<{ pushed: number; pulled: number }> | null = null;

export function isFirebaseConfigured(): boolean {
  return [options.apiKey, options.authDomain, options.projectId, options.appId]
    .every((value) => typeof value === 'string' && value.trim().length > 0);
}

function getServices(): { app: FirebaseApp; auth: Auth; db: Firestore; functions: Functions } {
  if (!isFirebaseConfigured()) {
    throw new Error('Cloud is not configured. Your data stays on this device.');
  }
  if (!services) {
    // Validate every endpoint before initializing anything; invalid emulator configuration
    // must never silently use a production service.
    const { region, emulators } = cloudConfiguration();
    const app = getApps().find((candidate) => candidate.name === APP_NAME) ?? initializeApp(options, APP_NAME);
    let auth: Auth;
    try {
      auth = initializeAuth(app, { persistence: authPersistence });
    } catch (error) {
      // Fast Refresh may recreate the native persistence constructor. Only reuse
      // our named app's already-configured Auth, never silently mask initialization failures.
      if (!(error instanceof FirebaseError) || error.code !== 'auth/already-initialized') throw error;
      auth = getAuth(app);
    }
    if (emulators && !auth.emulatorConfig) {
      const { host, port } = emulators.auth;
      connectAuthEmulator(auth, `http://${host === '::1' ? '[::1]' : host}:${port}`, { disableWarnings: true });
    }
    beforeAuthStateChanged(auth, () => { authGeneration += 1; });
    const db = getFirestore(app);
    const functions = getFunctions(app, region);
    if (emulators) {
      connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
      connectFunctionsEmulator(functions, emulators.functions.host, emulators.functions.port);
    }
    services = { app, auth, db, functions };
  }
  return services;
}

/** The callable shares the named app and persisted Auth used by cloud sync. */
export function getFirebaseAIServices(): { auth: Auth; functions: Functions } {
  const { auth, functions } = getServices();
  return { auth, functions };
}

function assertSession(session: FirebaseAISession): void {
  if (authTransitions || authGeneration !== session.generation || getServices().auth.currentUser?.uid !== session.uid) {
    throw new Error('AI_SESSION_CHANGED');
  }
}

export async function getFirebaseAISession(): Promise<FirebaseAISession> {
  const { auth } = getServices();
  await auth.authStateReady();
  if (authTransitions) throw new Error('AI_SESSION_CHANGED');
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('AI_AUTH_REQUIRED');
  return { uid, generation: authGeneration };
}

export async function assertFirebaseAISession(session: FirebaseAISession): Promise<void> {
  assertSession(session);
  if (revokedAIConsent.has(session.uid)) throw new Error('AI_CONSENT_REQUIRED');
  const consent = await getSetting(`aiConsent:${session.uid}`);
  assertSession(session);
  if (consent !== AI_CONSENT_VERSION || revokedAIConsent.has(session.uid)) throw new Error('AI_CONSENT_REQUIRED');
  const owner = await getSetting('syncOwner');
  assertSession(session);
  if (owner !== session.uid) throw new Error('AI_OWNER_MISMATCH');
}

export async function readCloudAIConsent(): Promise<boolean> {
  if (!isCloudAIConfigured()) return false;
  const { auth } = getServices();
  await auth.authStateReady();
  if (!auth.currentUser || authTransitions) return false;
  try {
    await assertFirebaseAISession({ uid: auth.currentUser.uid, generation: authGeneration });
    return true;
  } catch (error) {
    if (error instanceof Error && ['AI_SESSION_CHANGED', 'AI_CONSENT_REQUIRED', 'AI_OWNER_MISMATCH'].includes(error.message)) return false;
    throw error;
  }
}

export async function writeCloudAIConsent(enabled: boolean): Promise<void> {
  // Invalidate immediately, before any database/auth wait, including same-account revocation.
  if (!enabled) {
    authGeneration += 1;
    const currentUID = services?.auth.currentUser?.uid;
    if (currentUID) revokedAIConsent.add(currentUID);
    if (!isFirebaseConfigured()) return;
    const { auth } = getServices();
    await auth.authStateReady();
    if (authTransitions) throw new Error('AI_SESSION_CHANGED');
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    revokedAIConsent.add(uid);
    await setSetting(`aiConsent:${uid}`, 'false');
    return;
  }
  const session = await getFirebaseAISession();
  try { await claimSyncOwner(session.uid); } catch { throw new Error('AI_OWNER_MISMATCH'); }
  assertSession(session);
  await setSetting(`aiConsent:${session.uid}`, AI_CONSENT_VERSION);
  assertSession(session);
  revokedAIConsent.delete(session.uid);
}

export function subscribeAuth(listener: (user: { uid: string; email: string | null } | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    listener(null);
    return () => {};
  }
  try {
    return onAuthStateChanged(getServices().auth, (user) => {
      listener(user ? { uid: user.uid, email: user.email } : null);
    }, () => listener(null));
  } catch {
    // A broken/unsupported auth store must never stop the local-only finance app from starting.
    // Explicit sign-in and sync actions still reject the real initialization error.
    listener(null);
    return () => {};
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { auth } = getServices();
  authGeneration += 1;
  authTransitions += 1;
  try { await signInWithEmailAndPassword(auth, email.trim(), password); }
  finally { authTransitions -= 1; }
}

export async function signUp(email: string, password: string): Promise<void> {
  const { auth } = getServices();
  authGeneration += 1;
  authTransitions += 1;
  try { await createUserWithEmailAndPassword(auth, email.trim(), password); }
  finally { authTransitions -= 1; }
}

export async function signOut(): Promise<void> {
  authGeneration += 1;
  authTransitions += 1;
  try {
    const auth = isFirebaseConfigured() ? getServices().auth : null;
    if (auth) await auth.authStateReady();
    const uid = auth?.currentUser?.uid;
    if (uid) revokedAIConsent.add(uid);
    // Revoke both independently, so a failed settings write cannot skip the other.
    try {
      const results = await Promise.allSettled([
        setSetting('cloudSync', 'false'),
        ...(uid ? [setSetting(`aiConsent:${uid}`, 'false')] : []),
      ]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } finally {
      if (auth) await firebaseSignOut(auth);
    }
  } finally {
    authTransitions -= 1;
  }
}

/** No listener/background upload is installed: callers explicitly invoke sync after consent. */
export function syncTransactions(): Promise<{ pushed: number; pulled: number }> {
  if (activeSync) return activeSync;
  const operation = performSync();
  activeSync = operation;
  void operation.finally(() => {
    if (activeSync === operation) activeSync = null;
  }).catch(() => {});
  return operation;
}

async function performSync(): Promise<{ pushed: number; pulled: number }> {
  if (await getSetting('cloudSync') !== 'true') {
    throw new Error('Enable cloud sync explicitly before syncing.');
  }
  const { auth, db } = getServices();
  await auth.authStateReady();
  // Capture once. Never derive a path from mutable currentUser inside a loop or callback.
  const uid = auth.currentUser?.uid;
  const generation = authGeneration;
  if (!uid) throw new Error('Sign in before syncing.');
  const assertOwner = () => {
    if (authGeneration !== generation || auth.currentUser?.uid !== uid) {
      throw new Error('The signed-in account changed. Sync stopped; unsynced changes remain on this device.');
    }
  };
  const assertConsent = async () => {
    assertOwner();
    const enabled = await getSetting('cloudSync');
    assertOwner();
    if (enabled !== 'true') throw new Error('Cloud sync was disabled. Sync stopped.');
  };
  await assertConsent();
  await claimSyncOwner(uid);
  await assertConsent();
  const rows = await listSyncTransactions();
  await assertConsent();
  const dirty = rows.filter((row) => row.status === 'confirmed' || row.deletedAt !== null);
  const userCollection = collection(db, 'users', uid, 'transactions');
  let pushed = 0;
  let pulled = 0;

  for (let offset = 0; offset < dirty.length; offset += WRITE_BATCH_SIZE) {
    await assertConsent();
    const batch = dirty.slice(offset, offset + WRITE_BATCH_SIZE).map(toCloudTransaction);
    const references = batch.map((row) => doc(userCollection, row.id));
    const result = await runTransaction(db, async (transaction) => {
      await assertConsent();
      const remoteRows: (CloudTransaction | null)[] = [];
      // Firestore requires every read before any write. Sequential bounded work avoids an unbounded Promise.all.
      for (let index = 0; index < references.length; index += 1) {
        assertOwner();
        const snapshot = await transaction.get(references[index]);
        assertOwner();
        remoteRows.push(snapshot.exists() ? validateCloudTransaction(snapshot.data(), batch[index].id) : null);
      }
      await assertConsent();
      const winners: CloudTransaction[] = [];
      let writes = 0;
      for (let index = 0; index < batch.length; index += 1) {
        assertOwner();
        const local = batch[index];
        const remote = remoteRows[index];
        if (!remote || localWins(local, remote)) {
          transaction.set(references[index], { ...local });
          writes += 1;
        } else {
          winners.push(remote);
        }
      }
      return { writes, winners };
    });
    await assertConsent();
    // Revision-conditional acknowledgement cannot hide edits made while the network request was in flight.
    for (const row of batch) {
      await assertConsent();
      await markSynced(row.id, row.updatedAt);
    }
    await assertConsent();
    await mergeRemoteTransactions(result.winners.map(fromCloudTransaction));
    assertOwner();
    pushed += result.writes;
  }

  // Full, server-only paginated pull includes retained tombstones; no cache can leak a previous account.
  // A concurrent insertion behind the cursor is picked up on the next explicit sync.
  let cursor: QueryDocumentSnapshot | null = null;
  for (;;) {
    await assertConsent();
    const pageQuery: Query<DocumentData> = cursor
      ? query(userCollection, orderBy(documentId()), startAfter(cursor), limit(READ_PAGE_SIZE))
      : query(userCollection, orderBy(documentId()), limit(READ_PAGE_SIZE));
    const page = await getDocsFromServer(pageQuery);
    await assertConsent();
    const incoming = page.docs.map((snapshot) => fromCloudTransaction(validateCloudTransaction(snapshot.data(), snapshot.id)));
    await assertConsent();
    await mergeRemoteTransactions(incoming);
    assertOwner();
    pulled += incoming.length;
    if (page.size < READ_PAGE_SIZE) break;
    cursor = page.docs[page.docs.length - 1];
  }
  return { pushed, pulled };
}
