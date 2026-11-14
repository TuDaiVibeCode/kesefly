import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardModel, shiftMonth } from '../src/features/dashboard/model';
import { sampleAsOf, sampleTransactions } from '../src/features/dashboard/sample';
import type { Transaction } from '../src/types/transaction';

const row = (date: Date, amount: number, overrides: Partial<Transaction> = {}): Transaction => ({
  id: date.toISOString(), date: date.toISOString(), amount, currency: 'VND', category: 'Bills', merchant: 'Test', type: 'EXPENSE', status: 'confirmed', source: 'manual', sourcePackage: null, confidence: 1, updatedAt: 0, deletedAt: null, syncedAt: null, ...overrides,
});
test('sample totals reconcile and remain read-only input', () => {
  const original = JSON.stringify(sampleTransactions);
  const model = dashboardModel(sampleTransactions, '2026-11', sampleAsOf);
  assert.equal(model.spending, 8450000);
  assert.equal(model.comparison.previousSpending, 9600000);
  assert.equal(model.comparison.difference, -1150000);
  assert.equal(model.breakdown.reduce((sum, item) => sum + item.amount, 0), model.spending);
  assert.equal(model.recent.length, 5);
  assert.equal(JSON.stringify(sampleTransactions), original);
});
test('drafts, deleted and future-dated entries do not enter current totals', () => {
  const day = new Date(2026, 10, 10, 12);
  const rows = [row(day, 100), row(day, 200, { status: 'review' }), row(day, 300, { deletedAt: 1 }), row(new Date(2026, 10, 20), 400), row(day, 500, { type: 'INCOME' })];
  const model = dashboardModel(rows, '2026-11', new Date(2026, 10, 14));
  assert.equal(model.spending, 100); assert.equal(model.income, 500);
});
test('ongoing March compares common days in February without changing headline total', () => {
  const rows = [row(new Date(2026, 2, 28, 12), 100), row(new Date(2026, 2, 30, 12), 50), row(new Date(2026, 1, 28, 12), 80)];
  const model = dashboardModel(rows, '2026-03', new Date(2026, 2, 30, 18));
  assert.equal(model.spending, 150); assert.equal(model.comparison.comparableSpending, 100);
  assert.equal(model.comparison.currentEnd, '2026-03-28'); assert.equal(model.comparison.previousEnd, '2026-02-28');
  assert.equal(model.comparison.percent, 25);
});
test('completed months compare complete months, including leap day and year rollover', () => {
  const model = dashboardModel([], '2024-03', new Date(2026, 10, 14));
  assert.equal(model.comparison.currentEnd, '2024-03-31');assert.equal(model.comparison.previousEnd,'2024-02-29');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
test('absent and zero expense baselines never invent percentage change', () => {
  const current = row(new Date(2026, 10, 10), 100);
  const missing = dashboardModel([current], '2026-11', sampleAsOf);
  assert.equal(missing.comparison.available, false); assert.equal(missing.comparison.percent, null);
  const zero = dashboardModel([current, row(new Date(2026, 9, 10), 100, { type: 'INCOME' })], '2026-11', sampleAsOf);
  assert.equal(zero.comparison.available, true); assert.equal(zero.comparison.percent, null);
});
test('more than five categories aggregate Other exactly once without losing money', () => {
  const categories = ['Food & Drink','Shopping','Transport','Bills','Transfer','Salary','Other'] as const;
  const rows = categories.map((category, i) => row(new Date(2026, 10, 10), (i+1)*100, { category, id: category }));
  const model = dashboardModel(rows, '2026-11', sampleAsOf);
  assert.equal(model.breakdown.length, 5); assert.equal(model.breakdown.filter((item) => item.category === 'Other').length, 1);
  assert.equal(model.breakdown.reduce((sum, item) => sum+item.amount, 0), 2800);
});
