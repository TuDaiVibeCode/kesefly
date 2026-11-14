import { CATEGORIES, type ParsedTransaction } from '../../types/transaction';

const KEYS = ['amount', 'currency', 'type', 'merchant', 'category', 'date', 'confidence'];

/** Require a real calendar timestamp, not Date.parse's rollover normalization. */
export function isCalendarISO(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , zone] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  if (zone !== 'Z') {
    const h = Number(zone.slice(1, 3)), min = Number(zone.slice(4));
    if (h > 14 || min > 59 || (h === 14 && min !== 0)) return false;
  }
  return Number.isFinite(Date.parse(value));
}

export function validateParsedTransaction(value: unknown): ParsedTransaction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No unambiguous VND transaction found. Enter or review it manually.');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== KEYS.length || KEYS.some((key) => !Object.prototype.hasOwnProperty.call(row, key))) throw new Error('Model returned unexpected transaction fields.');
  if (row.currency !== 'VND') throw new Error('Only VND transactions are supported.');
  if (typeof row.type !== 'string' || (row.type !== 'EXPENSE' && row.type !== 'INCOME')) throw new Error('Invalid transaction direction.');
  if (typeof row.amount !== 'number' || !Number.isSafeInteger(row.amount) || row.amount <= 0 || row.amount > 1e15) throw new Error('Amount must be positive whole VND no greater than 1e15.');
  if (!CATEGORIES.some((category) => category === row.category)) throw new Error('Invalid transaction category.');
  if (typeof row.merchant !== 'string' || !row.merchant.trim() || row.merchant.length > 160 || row.merchant.trim() !== row.merchant || /[\u0000-\u001f\u007f]/.test(row.merchant)) throw new Error('Invalid merchant.');
  if (!isCalendarISO(row.date)) throw new Error('Invalid transaction calendar timestamp.');
  if (typeof row.confidence !== 'number' || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) throw new Error('Invalid model confidence.');
  return { amount: row.amount, currency: 'VND', type: row.type, merchant: row.merchant, category: row.category as ParsedTransaction['category'], date: new Date(row.date).toISOString(), confidence: row.confidence };
}
export const EXTRACTION_SCHEMA = JSON.stringify({
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false, required: KEYS,
      properties: {
        amount: { type: 'integer', minimum: 1, maximum: 1e15 },
        currency: { type: 'string', enum: ['VND'] },
        type: { type: 'string', enum: ['EXPENSE', 'INCOME'] },
        category: { type: 'string', enum: [...CATEGORIES] },
        date: { type: 'string' },
        merchant: { type: 'string', minLength: 1, maxLength: 160 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  ],
});
