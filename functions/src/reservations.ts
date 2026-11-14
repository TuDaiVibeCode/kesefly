import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ParseTransactionResponse } from '../../src/types/ai';
import { validateCompletion } from './provider';
import { userKey } from './input';

export const USER_DAILY_LIMIT = 100;
export const GLOBAL_DAILY_LIMIT = 1000;
export const RESERVED_CENTS_PER_ATTEMPT = 2;
export const LIFETIME_RESERVED_CENTS = 500;
export const CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
export const PENDING_TTL_MS = 2 * 60_000;
export const REQUEST_COLLECTION = '_aiRequests';
export const RESULT_COLLECTION = '_aiResults';

type FailureCode = 'REQUEST_PENDING' | 'REQUEST_EXPIRED' | 'REQUEST_ID_CONFLICT' | 'REQUEST_FAILED' | 'QUOTA_EXCEEDED' | 'AI_UNAVAILABLE';
export type ReservationDecision = { kind: 'reserved' } | { kind: 'completed'; result: ParseTransactionResponse } | { kind: 'error'; code: FailureCode; expire?: boolean };

/** Permanent request tombstones outlive the TTL-controlled structured result cache. */
export function existingReservation(request: DocumentData, result: DocumentData | undefined, digest: string, now: number): ReservationDecision {
  if (request.digest !== digest) return { kind: 'error', code: 'REQUEST_ID_CONFLICT' };
  if (request.status === 'expired') return { kind: 'error', code: 'REQUEST_EXPIRED' };
  if (request.status === 'failed') return { kind: 'error', code: 'REQUEST_FAILED' };
  if (!(request.expiresAt instanceof Timestamp) || request.expiresAt.toMillis() <= now) return { kind: 'error', code: 'REQUEST_EXPIRED', expire: true };
  if (request.status === 'pending') return { kind: 'error', code: 'REQUEST_PENDING' };
  if (request.status !== 'completed' || !result || !(result.expiresAt instanceof Timestamp) || result.expiresAt.toMillis() <= now) return { kind: 'error', code: 'REQUEST_EXPIRED', expire: true };
  try {
    return { kind: 'completed', result: validateCompletion(result.response) };
  } catch {
    return { kind: 'error', code: 'REQUEST_EXPIRED', expire: true };
  }
}

export function reservationError(code: FailureCode): HttpsError {
  const errors: Record<FailureCode, [ConstructorParameters<typeof HttpsError>[0], string]> = {
    REQUEST_PENDING: ['aborted', 'This extraction request is already processing. Retry the same request later.'],
    REQUEST_EXPIRED: ['failed-precondition', 'This request has expired and cannot be sent again. Review manually or explicitly retry with a new request.'],
    REQUEST_ID_CONFLICT: ['already-exists', 'This request ID was already used for different input.'],
    REQUEST_FAILED: ['unavailable', 'This request did not complete and will not be sent again. Review manually or explicitly retry with a new request.'],
    QUOTA_EXCEEDED: ['resource-exhausted', 'The cloud extraction reservation limit has been reached. Use manual entry.'],
    AI_UNAVAILABLE: ['failed-precondition', 'Cloud extraction is not configured or is disabled in this environment.'],
  };
  return new HttpsError(...errors[code], { code });
}

function usedCount(data: DocumentData | undefined, field: string): number {
  if (!data) return 0;
  const value: unknown = data[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw reservationError('QUOTA_EXCEEDED');
  return value;
}

export async function reserveRequest(key: string, uid: string, digest: string, providerEnabled: boolean): Promise<ReservationDecision> {
  const db = getFirestore();
  const requestRef = db.collection(REQUEST_COLLECTION).doc(key);
  const resultRef = db.collection(RESULT_COLLECTION).doc(key);
  return db.runTransaction(async (tx): Promise<ReservationDecision> => {
    const now = Date.now();
    const [request, result] = await tx.getAll(requestRef, resultRef);
    if (request.exists) {
      const decision = existingReservation(request.data()!, result.data(), digest, now);
      if (decision.kind === 'error' && decision.expire) {
        tx.update(requestRef, { status: 'expired', updatedAt: Timestamp.fromMillis(now) });
        if (result.exists) tx.delete(resultRef);
      }
      return decision;
    }
    if (!providerEnabled) return { kind: 'error', code: 'AI_UNAVAILABLE' };
    const day = new Date(now).toISOString().slice(0, 10);
    const userRef = db.collection('_aiRateLimits').doc(`user_${userKey(uid)}_${day}`);
    const globalRef = db.collection('_aiRateLimits').doc(`global_${day}`);
    const budgetRef = db.collection('_aiBudget').doc('lifetime');
    const [user, global, budget] = await tx.getAll(userRef, globalRef, budgetRef);
    const userUsed = usedCount(user.data(), 'attempts');
    const globalUsed = usedCount(global.data(), 'attempts');
    const reservedCents = usedCount(budget.data(), 'reservedCents');
    if (userUsed >= USER_DAILY_LIMIT || globalUsed >= GLOBAL_DAILY_LIMIT || reservedCents + RESERVED_CENTS_PER_ATTEMPT > LIFETIME_RESERVED_CENTS) return { kind: 'error', code: 'QUOTA_EXCEEDED' };
    const timestamp = Timestamp.fromMillis(now);
    tx.create(requestRef, { digest, status: 'pending', createdAt: timestamp, updatedAt: timestamp, expiresAt: Timestamp.fromMillis(now + PENDING_TTL_MS) });
    tx.set(userRef, { attempts: userUsed + 1, day, updatedAt: timestamp });
    tx.set(globalRef, { attempts: globalUsed + 1, day, updatedAt: timestamp });
    tx.set(budgetRef, { reservedCents: reservedCents + RESERVED_CENTS_PER_ATTEMPT, updatedAt: timestamp });
    return { kind: 'reserved' };
  });
}

export async function completeRequest(key: string, digest: string, response: ParseTransactionResponse): Promise<boolean> {
  const db = getFirestore();
  const ref = db.collection(REQUEST_COLLECTION).doc(key);
  return db.runTransaction(async (tx) => {
    const request = await tx.get(ref);
    const data = request.data();
    const now = Date.now();
    if (!data || data.digest !== digest || data.status !== 'pending') return false;
    if (!(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() <= now) {
      tx.update(ref, { status: 'expired', updatedAt: Timestamp.fromMillis(now) });
      return false;
    }
    const expiresAt = Timestamp.fromMillis(now + CACHE_TTL_MS);
    tx.set(db.collection(RESULT_COLLECTION).doc(key), { response, expiresAt });
    tx.update(ref, { status: 'completed', expiresAt, updatedAt: Timestamp.fromMillis(now) });
    return true;
  });
}

export async function failRequest(key: string, digest: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(REQUEST_COLLECTION).doc(key);
  await db.runTransaction(async (tx) => {
    const request = await tx.get(ref);
    const data = request.data();
    if (data?.digest === digest && data.status === 'pending') tx.update(ref, { status: 'failed', updatedAt: Timestamp.now() });
  });
}
