import { getApps, initializeApp } from 'firebase-admin/app';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { ParseTransactionResponse } from '../../src/types/ai';
import { payloadDigest, requestKey, validateRequest } from './input';
import { DEFAULT_MODEL, extractTransaction } from './provider';
import { completeRequest, failRequest, reservationError, reserveRequest } from './reservations';

if (!getApps().length) initializeApp();
const openAIKey = defineSecret('OPENAI_API_KEY');

export const parseTransaction = onCall<unknown>(
  {
    region: 'asia-southeast1',
    secrets: [openAIKey],
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 5,
    concurrency: 10,
    minInstances: 0,
  },
  async (request): Promise<ParseTransactionResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before using cloud extraction.');
    const input = validateRequest(request.data, Date.now());
    const digest = payloadDigest(input);
    const key = requestKey(request.auth.uid, input.requestId);
    const emulator = process.env.FUNCTIONS_EMULATOR === 'true';
    const liveAllowed = !emulator || process.env.OPENAI_ALLOW_EMULATOR_LIVE === 'true';
    // Missing secrets must not prevent startup, unauthenticated guards, or safe emulator checks.
    const apiKey = liveAllowed ? (process.env.OPENAI_API_KEY ?? '').trim() : '';
    const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
    const providerEnabled = liveAllowed && apiKey.length > 0 && model === DEFAULT_MODEL;
    try {
      const reservation = await reserveRequest(key, request.auth.uid, digest, providerEnabled);
      if (reservation.kind === 'error') throw reservationError(reservation.code);
      if (reservation.kind === 'completed') return reservation.result;
      let response: ParseTransactionResponse;
      try {
        response = await extractTransaction(input, apiKey, model);
      } catch {
        // A timeout/error may still be billed. Never release quota or resubmit this ID.
        await failRequest(key, digest);
        throw reservationError('REQUEST_FAILED');
      }
      if (!await completeRequest(key, digest, response)) throw reservationError('REQUEST_EXPIRED');
      return response;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      // No provider/Firestore exception details, raw text, images, or response bodies escape.
      throw new HttpsError('unavailable', 'Cloud extraction is temporarily unavailable. Retry the same request later.');
    }
  },
);
