export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL CHECK(currency = 'VND'),
  type TEXT NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  confidence REAL NOT NULL,
  source TEXT NOT NULL,
  sourcePackage TEXT,
  status TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER,
  syncedAt INTEGER
);
CREATE INDEX IF NOT EXISTS transactions_date ON transactions(date DESC);
CREATE TABLE IF NOT EXISTS alert_queue (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  imageUri TEXT,
  source TEXT NOT NULL,
  sourcePackage TEXT,
  receivedAt INTEGER NOT NULL,
  error TEXT
);
CREATE TABLE IF NOT EXISTS processed_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  receivedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
PRAGMA user_version = 1;
`;
