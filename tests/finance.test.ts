import test from 'node:test';
import assert from 'node:assert/strict';
import { preFilter } from '../src/core/ingestion/regexPreFilter';
import { findDuplicateCandidates } from '../src/core/ingestion/deduplicator';
import { isCalendarISO, validateParsedTransaction } from '../src/core/ai/validation';
import { localWins, toCloudTransaction, validateCloudTransaction } from '../src/core/firebase/transactionDto';
import type { ParsedTransaction, Transaction } from '../src/types/transaction';

const parsed: ParsedTransaction = { amount: 65000, currency: 'VND', type: 'EXPENSE', merchant: 'Highlands Coffee', category: 'Food & Drink', date: '2026-11-14T08:00:00.000Z', confidence: 0.96 };
const transaction: Transaction = { ...parsed, id: 'tx-1', source: 'notification', sourcePackage: 'com.VCB', status: 'confirmed', updatedAt: 1794643200000, deletedAt: null, syncedAt: null };

test('OTP mixed with an amount is never queued for inference', () => {
  assert.equal(preFilter('VCB OTP 123456 xac nhan thanh toan 65,000 VND').accepted, false);
  assert.equal(preFilter('Mã xác thực giao dịch 65000 VND: 123456').accepted, false);
});
test('Vietnamese debit and credit alerts pass, promotions do not', () => {
  assert.equal(preFilter('VCB: TK 123 GD -65,000 VND tai HIGHLANDS. SD 900,000 VND').accepted, true);
  assert.equal(preFilter('Biến động số dư +1.000.000 VND từ Nguyen Van A').accepted, true);
  assert.equal(preFilter('Ưu đãi giảm giá 65.000 VND cho bạn').accepted, false);
  assert.equal(preFilter('Giao dịch -65000 USD tại cửa hàng').accepted, false);
});
test('model output cannot smuggle fields or invalid money into transactions', () => {
  for (const value of [null, { ...parsed, amount: -1 }, { ...parsed, amount: 0.1 }, { ...parsed, currency: 'USD' },
    { ...parsed, confidence: NaN }, { ...parsed, category: 'Unknown' }, { ...parsed, rawText: 'private' }]) {
    assert.throws(() => validateParsedTransaction(value));
  }
});
test('calendar rollover rejects invalid dates while Vietnam timezone normalizes correctly', () => {
  assert.equal(isCalendarISO('2025-02-29T08:00:00Z'), false);
  assert.equal(isCalendarISO('2024-02-29T24:00:00Z'), false);
  assert.equal(isCalendarISO('2024-02-29T08:00:00+14:01'), false);
  assert.equal(validateParsedTransaction({ ...parsed, date: '2026-11-14T15:00:00+07:00' }).date, parsed.date);
});
test('duplicate candidates span a five-minute bucket boundary without removing legitimate purchases', () => {
  const first = { ...transaction, date: '2026-11-14T08:04:59.000Z' };
  const second = { ...transaction, id: 'tx-2', date: '2026-11-14T08:05:01.000Z' };
  const rows = [first, second, { ...transaction, id: 'income', type: 'INCOME' as const }, { ...transaction, id: 'deleted', deletedAt: 1 }];
  assert.deepEqual(findDuplicateCandidates({ ...parsed, date: '2026-11-14T08:05:00.000Z' }, rows).map((row) => row.id), ['tx-1', 'tx-2']);
  assert.equal(rows.length, 4);
});
test('cloud serializer drops private local fields even if the caller adds raw data', () => {
  const input = { ...transaction, text: 'SECRET NOTIFICATION', imageUri: 'file:///private.jpg', error: 'SECRET ERROR' };
  const cloud = toCloudTransaction(input);
  assert.equal('sourcePackage' in cloud, false);
  assert.equal('syncedAt' in cloud, false);
  assert.equal(JSON.stringify(cloud).includes('SECRET'), false);
  assert.equal(JSON.stringify(cloud).includes('private.jpg'), false);
  assert.throws(() => validateCloudTransaction({ ...cloud, rawText: 'private' }, cloud.id));
  assert.throws(() => toCloudTransaction({ ...transaction, status: 'review' }));
});
test('sync conflict resolution preserves newer revisions and deletion on ties', () => {
  const remote = toCloudTransaction(transaction);
  assert.equal(localWins({ ...remote, updatedAt: remote.updatedAt - 1 }, remote), false);
  assert.equal(localWins({ ...remote, updatedAt: remote.updatedAt + 1 }, remote), true);
  assert.equal(localWins({ ...remote, deletedAt: remote.updatedAt }, remote), true);
  assert.equal(localWins(remote, { ...remote, deletedAt: remote.updatedAt }), false);
});
