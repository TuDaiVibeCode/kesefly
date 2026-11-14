import { CATEGORIES, type Category, type Transaction } from '../../types/transaction';

/** The entire cloud schema. Never spread a local transaction or queue entry into a write. */
export interface CloudTransaction {
  id: string;
  amount: number;
  currency: 'VND';
  type: 'EXPENSE' | 'INCOME';
  merchant: string;
  category: Category;
  date: string;
  confidence: number;
  source: 'notification' | 'manual' | 'image';
  status: 'review' | 'confirmed';
  updatedAt: number;
  deletedAt: number | null;
}

const KEYS = new Set([
  'id', 'amount', 'currency', 'type', 'merchant', 'category', 'date',
  'confidence', 'source', 'status', 'updatedAt', 'deletedAt',
]);
const MAX_TIMESTAMP = 8_640_000_000_000_000;
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_TIMESTAMP;
}

export function validateCloudTransaction(value: unknown, expectedId: string): CloudTransaction {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Cloud transaction has an invalid schema.');
  }
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length !== KEYS.size || keys.some((key) => !KEYS.has(key)) ||
      typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(row.id) || row.id !== expectedId ||
      typeof row.amount !== 'number' || !Number.isSafeInteger(row.amount) || row.amount <= 0 || row.amount > 1e15 ||
      row.currency !== 'VND' || (row.type !== 'EXPENSE' && row.type !== 'INCOME') ||
      typeof row.merchant !== 'string' || row.merchant.trim().length === 0 || row.merchant !== row.merchant.trim() ||
      row.merchant.length > 160 || /[\u0000-\u001f\u007f]/.test(row.merchant) ||
      typeof row.category !== 'string' || !CATEGORIES.some((category) => category === row.category) ||
      typeof row.date !== 'string' || !ISO_DATE.test(row.date) ||
      !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString() !== row.date ||
      typeof row.confidence !== 'number' || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1 ||
      (row.source !== 'notification' && row.source !== 'manual' && row.source !== 'image') ||
      (row.status !== 'review' && row.status !== 'confirmed') ||
      !isTimestamp(row.updatedAt) ||
      (row.deletedAt !== null && (!isTimestamp(row.deletedAt) || row.deletedAt > row.updatedAt)) ||
      (row.status !== 'confirmed' && row.deletedAt === null)) {
    // Never include document contents, model output, or raw text in errors.
    throw new Error('Cloud transaction failed schema validation.');
  }
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    type: row.type,
    merchant: row.merchant,
    category: row.category as Category,
    date: row.date,
    confidence: row.confidence,
    source: row.source as CloudTransaction['source'],
    status: row.status,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt as number | null,
  };
}

export function toCloudTransaction(row: Transaction): CloudTransaction {
  return validateCloudTransaction({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    type: row.type,
    merchant: row.merchant,
    category: row.category,
    date: row.date,
    confidence: row.confidence,
    source: row.source,
    status: row.status,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }, row.id);
}

export function fromCloudTransaction(row: CloudTransaction): Transaction {
  return {
    ...row,
    sourcePackage: null,
    syncedAt: null,
  };
}

/** On equal revisions the existing server wins, except a tombstone beats a live record. */
export function localWins(local: CloudTransaction, remote: CloudTransaction): boolean {
  return local.updatedAt > remote.updatedAt ||
    (local.updatedAt === remote.updatedAt && local.deletedAt !== null && remote.deletedAt === null);
}
