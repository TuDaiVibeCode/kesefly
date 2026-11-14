import type { ParsedTransaction, Transaction } from '@/types/transaction';

// Amount + direction + time is evidence for review, never proof that two purchases are one.
export function findDuplicateCandidates(parsed: ParsedTransaction, rows: Transaction[]): Transaction[] {
  const timestamp = Date.parse(parsed.date);
  return rows.filter((row) => row.deletedAt === null && row.amount === parsed.amount &&
    row.currency === parsed.currency && row.type === parsed.type &&
    Math.abs(Date.parse(row.date) - timestamp) <= 5 * 60 * 1000);
}
