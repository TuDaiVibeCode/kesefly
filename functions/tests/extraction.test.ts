import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { AI_CONSENT_VERSION, type ParseTransactionRequest } from '../../src/types/ai';
import { payloadDigest, requestKey, validateRequest } from '../src/input';
import { consumeProviderResponse, validateCompletion } from '../src/provider';
import { existingReservation, reservationError } from '../src/reservations';

const now = Date.UTC(2026, 10, 14, 12);
const request: ParseTransactionRequest = { requestId: 'request_1234567890', consentVersion: AI_CONSENT_VERSION, text: 'Thanh toan 50000 VND tai Cafe', receivedAt: now, image: null };
const transaction = { amount: 50000, currency: 'VND', type: 'EXPENSE', merchant: 'Cafe', category: 'Food & Drink', date: '2026-11-14T12:00:00.000Z', confidence: 0.9 };
const completion = { transaction };
const output = (text: string) => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] }] });

test('request rejects unbounded, malformed, future, unsupported and absent evidence', () => {
  assert.deepEqual(validateRequest(request, now), request);
  for (const change of [{ text: 'a'.repeat(6001) }, { text: '' }, { requestId: '../bad' }, { consentVersion: 'old' }, { receivedAt: now + 300001 }, { receivedAt: 0 }, { receivedAt: NaN }, { unknown: true }, { image: { base64: 'not base64', mimeType: 'image/jpeg' } }]) {
    assert.throws(() => validateRequest({ ...request, ...change }, now), HttpsError);
  }
});

test('image MIME must match canonical bounded bytes', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  assert.equal(validateRequest({ ...request, image: { base64: jpeg, mimeType: 'image/jpeg' } }, now).image?.base64, jpeg);
  assert.throws(() => validateRequest({ ...request, image: { base64: jpeg, mimeType: 'image/png' } }, now), HttpsError);
  assert.throws(() => validateRequest({ ...request, image: { base64: jpeg + '\n', mimeType: 'image/jpeg' } }, now), HttpsError);
  assert.throws(() => validateRequest({ ...request, image: { base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64'), mimeType: 'image/jpeg' } }, now), HttpsError);
});

test('digest includes consent, time, text and image but UID namespaces request ID', () => {
  assert.equal(payloadDigest(request), payloadDigest({ ...request, requestId: 'another_request_123' }));
  assert.notEqual(payloadDigest(request), payloadDigest({ ...request, text: request.text + '!' }));
  assert.notEqual(payloadDigest(request), payloadDigest({ ...request, receivedAt: now - 1 }));
  assert.notEqual(requestKey('one', request.requestId), requestKey('two', request.requestId));
});

test('structured output enforces business validator and canonical UTC', () => {
  assert.deepEqual(validateCompletion(completion), completion);
  assert.deepEqual(validateCompletion({ transaction: null }), { transaction: null });
  for (const value of [{ ...completion, extra: true }, { transaction: { ...transaction, amount: 1.2 } }, { transaction: { ...transaction, date: '2026-11-14T19:00:00+07:00' } }, { transaction: { ...transaction, date: '2026-02-30T12:00:00.000Z' } }, { transaction: { ...transaction, currency: 'USD' } }, { transaction: { ...transaction, merchant: ' Cafe ' } }]) assert.throws(() => validateCompletion(value));
});

test('provider consumer accepts only completed single-message JSON or refusal', () => {
  assert.deepEqual(consumeProviderResponse(output(JSON.stringify(completion))), completion);
  assert.deepEqual(consumeProviderResponse(output('{"transaction":null}')), { transaction: null });
  assert.deepEqual(consumeProviderResponse({ status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'no' }] }] }), { transaction: null });
  for (const value of [{ ...output('{}'), status: 'incomplete' }, output('not json'), output('{"transaction":null,"extra":1}'), { status: 'completed', output: [] }, { status: 'completed', output: [...output('{}').output, ...output('{}').output] }, { status: 'completed', output: [{ type: 'function_call' }] }]) assert.throws(() => consumeProviderResponse(value));
});

test('replays never re-reserve pending, failed, expired or conflicting IDs', () => {
  const digest = payloadDigest(request);
  const pending = { digest, status: 'pending', expiresAt: Timestamp.fromMillis(now + 1) };
  assert.deepEqual(existingReservation(pending, undefined, digest, now), { kind: 'error', code: 'REQUEST_PENDING' });
  assert.deepEqual(existingReservation(pending, undefined, 'different', now), { kind: 'error', code: 'REQUEST_ID_CONFLICT' });
  assert.deepEqual(existingReservation(pending, undefined, digest, now + 1), { kind: 'error', code: 'REQUEST_EXPIRED', expire: true });
  assert.deepEqual(existingReservation({ ...pending, status: 'failed' }, undefined, digest, now), { kind: 'error', code: 'REQUEST_FAILED' });
  assert.deepEqual(existingReservation({ ...pending, status: 'expired' }, undefined, digest, now), { kind: 'error', code: 'REQUEST_EXPIRED' });
  const completed = { ...pending, status: 'completed' };
  assert.deepEqual(existingReservation(completed, { expiresAt: pending.expiresAt, response: completion }, digest, now), { kind: 'completed', result: completion });
  assert.deepEqual(existingReservation(completed, undefined, digest, now), { kind: 'error', code: 'REQUEST_EXPIRED', expire: true });
  assert.deepEqual(existingReservation(completed, { expiresAt: Timestamp.fromMillis(now), response: completion }, digest, now), { kind: 'error', code: 'REQUEST_EXPIRED', expire: true });
  const details: unknown = reservationError('REQUEST_ID_CONFLICT').details;
  assert.ok(details && typeof details === 'object' && 'code' in details);
  assert.equal(details.code, 'REQUEST_ID_CONFLICT');
});
