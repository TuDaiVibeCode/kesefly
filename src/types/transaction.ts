export const CATEGORIES = ['Food & Drink', 'Shopping', 'Transport', 'Bills', 'Transfer', 'Salary', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Direction = 'EXPENSE' | 'INCOME';
export type IngestionSource = 'notification' | 'manual' | 'image';
export interface ParsedTransaction {
  amount: number;
  currency: 'VND';
  type: Direction;
  merchant: string;
  category: Category;
  date: string;
  confidence: number;
}
export interface Transaction extends ParsedTransaction {
  id: string;
  source: IngestionSource;
  sourcePackage: string | null;
  status: 'review' | 'confirmed';
  updatedAt: number;
  deletedAt: number | null;
  syncedAt: number | null;
}
export interface QueuedAlert {
  id: string;
  text: string;
  imageUri: string | null;
  source: IngestionSource;
  sourcePackage: string | null;
  receivedAt: number;
  error: string | null;
}
export interface NativeBankAlert {
  id: string;
  text: string;
  packageName: string;
  receivedAt: number;
}
