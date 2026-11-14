import type { Category, Transaction } from '@/types/transaction';

// Read-only fixture. Never inserted into SQLite, uploaded, or passed to edit/delete actions.
export const sampleAsOf = new Date(2026, 10, 14, 18);
function expense(id: string, merchant: string, amount: number, category: Category, month: number, day: number): Transaction {
  return { id: `sample-${id}`, merchant, amount, category, currency: 'VND', type: 'EXPENSE', date: new Date(2026, month - 1, day, 12).toISOString(), confidence: 1,
    source: 'manual', sourcePackage: null, status: 'confirmed', updatedAt: 0, deletedAt: null, syncedAt: null };
}
export const sampleTransactions: readonly Transaction[] = [
  expense('groceries', 'Đi chợ', 185000, 'Food & Drink', 11, 14),
  expense('power', 'Tiền điện', 420000, 'Bills', 11, 13),
  expense('lunch', 'Bữa trưa', 55000, 'Food & Drink', 11, 13),
  expense('food', 'Ăn uống trong kỳ', 1910000, 'Food & Drink', 11, 10),
  expense('rent', 'Tiền nhà', 4200000, 'Bills', 11, 1),
  expense('utilities', 'Dịch vụ gia đình', 930000, 'Bills', 11, 3),
  expense('other', 'Chi phí khác', 750000, 'Other', 11, 5),
  expense('previous', 'Chi tiêu kỳ trước', 9600000, 'Other', 10, 14),
];
