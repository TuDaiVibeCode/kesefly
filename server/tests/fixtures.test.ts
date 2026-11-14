import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureMismatches, PARSER_FIXTURES } from '../fixtures/parser';

function fixture(id: string) {
  const found = PARSER_FIXTURES.find((value) => value.id === id);
  if (!found) throw new Error('Fixture ID is not defined');
  return found;
}
// Independent hand-authored candidate outputs exercise the comparator, not model accuracy.
const cafeCandidate = {
  amount: 65000, currency: 'VND', type: 'EXPENSE', merchant: 'KES EFLY CAFE',
  category: 'Food & Drink', date: '2026-11-14T08:00:00.000Z', confidence: 0.87,
};

test('separates a completed payment from its balance and detects direction mistakes', () => {
  const market = fixture('separators-dots-balance');
  const candidate = { amount: 1250000, currency: 'VND', type: 'EXPENSE', merchant: 'DEMO MARKET',
    category: 'Shopping', date: '2026-11-14T05:00:00.000Z', confidence: 0.8 };
  assert.deepEqual(fixtureMismatches(market, candidate), []);
  assert.deepEqual(fixtureMismatches(market, { ...candidate, amount: 9750000 }), ['amount']);
  assert.deepEqual(fixtureMismatches(market, { ...candidate, type: 'INCOME' }), ['type']);
  // The balance case deliberately does not demand a subjective category or confidence.
  assert.deepEqual(fixtureMismatches(market, { ...candidate, category: 'Other', confidence: 0.3 }), []);
});

test('rejects fabricated transactions for OTP, balance, conflicting dates and injection', () => {
  for (const id of ['nontransaction-otp', 'balance-only', 'ambiguous-conflicting-date', 'nontransaction-security-injection']) {
    assert.deepEqual(fixtureMismatches(fixture(id), cafeCandidate), ['transaction']);
    assert.deepEqual(fixtureMismatches(fixture(id), null), []);
  }
  assert.deepEqual(fixtureMismatches(fixture('expense-cafe'), null), ['transaction']);
});

test('date-only Vietnam local midnight belongs to the previous UTC day', () => {
  const candidate = { amount: 900000, currency: 'VND', type: 'INCOME', merchant: 'DEMO CLIENT',
    category: 'Other', date: '2026-11-12T17:00:00.000Z', confidence: 0.7 };
  assert.deepEqual(fixtureMismatches(fixture('income-date-only'), candidate), []);
  assert.deepEqual(fixtureMismatches(fixture('income-date-only'), { ...candidate, date: '2026-11-13T00:00:00.000Z' }), ['date']);
});

test('time-only evidence uses reference Vietnam date rather than UTC midnight', () => {
  const candidate = { amount: 189000, currency: 'VND', type: 'EXPENSE', merchant: 'DEMO STORE',
    category: 'Shopping', date: '2026-11-13T17:10:00.000Z', confidence: 0.8 };
  assert.deepEqual(fixtureMismatches(fixture('expense-shopping-time'), candidate), []);
  assert.deepEqual(fixtureMismatches(fixture('expense-shopping-time'), { ...candidate, date: '2026-11-14T00:10:00.000Z' }), ['date']);
});

test('explicit early-month Vietnam time crosses to the preceding UTC month', () => {
  const candidate = { amount: 125000, currency: 'VND', type: 'INCOME', merchant: 'DEMO REBATE',
    category: 'Other', date: '2026-10-31T17:05:00.000Z', confidence: 0.8 };
  assert.deepEqual(fixtureMismatches(fixture('income-month-edge'), candidate), []);
  assert.deepEqual(fixtureMismatches(fixture('income-month-edge'), { ...candidate, date: '2026-11-01T00:05:00.000Z' }), ['date']);
});

test('paid image receipt requires seller, final total, direction and exact instant', () => {
  assert.deepEqual(fixtureMismatches(fixture('image-paid-cafe'), cafeCandidate), []);
  assert.deepEqual(fixtureMismatches(fixture('image-paid-cafe'), { ...cafeCandidate, amount: 650000, merchant: 'OTHER SHOP', type: 'INCOME' }), ['amount', 'type', 'merchant']);
  assert.deepEqual(fixtureMismatches(fixture('image-paid-cafe'), { ...cafeCandidate, date: '2026-11-14T15:00:00.000Z' }), ['date']);
});

test('validates the full domain result even when confidence or category is not expected', () => {
  for (const changes of [
    { currency: 'USD' }, { amount: 1.5 }, { amount: 0 }, { amount: 1e15 + 1 }, { category: 'Invented' },
    { merchant: ' KES EFLY CAFE ' }, { confidence: NaN }, { date: '2026-02-30T08:00:00.000Z' }, { extra: 'unexpected' },
  ]) assert.deepEqual(fixtureMismatches(fixture('expense-cafe'), { ...cafeCandidate, ...changes }), ['schema']);
  assert.deepEqual(fixtureMismatches(fixture('expense-cafe'), undefined), ['schema']);
  assert.deepEqual(fixtureMismatches(fixture('expense-cafe'), { ...cafeCandidate, date: '2026-11-14T15:00:00+07:00' }), ['date']);
});

test('mismatch diagnostics contain field names only, never returned values', () => {
  const fields = fixtureMismatches(fixture('expense-cafe'), { ...cafeCandidate, merchant: 'PRIVATE-SENTINEL', amount: 999999 });
  assert.deepEqual(fields, ['amount', 'merchant']);
  assert.equal(JSON.stringify(fields).includes('PRIVATE-SENTINEL'), false);
});
