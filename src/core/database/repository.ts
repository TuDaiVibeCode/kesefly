import * as SQLite from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import type { IngestionSource, ParsedTransaction, QueuedAlert, Transaction } from '@/types/transaction';
import { validateParsedTransaction } from '@/core/ai/validation';
import { protectPrivateStorage } from '@/core/ingestion/nativeCapture';
import { SCHEMA } from './schema';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;
let writes: Promise<unknown> = Promise.resolve();

function database() {
  if (!opening) {
    opening = protectPrivateStorage().then(() => SQLite.openDatabaseAsync('kesefly.db')).then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    }).catch((error) => { opening = null; throw error; });
  }
  return opening;
}

// Serialize app writes; remote merges and local edits cannot interleave read/modify/write.
function write<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const result = writes.then(async () => operation(await database()));
  writes = result.catch(() => undefined);
  return result;
}

export async function initializeDatabase(): Promise<void> { await database(); }

export async function listTransactions(): Promise<Transaction[]> {
  const db = await database();
  return db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE deletedAt IS NULL ORDER BY date DESC');
}

async function put(db: SQLite.SQLiteDatabase, row: Transaction) {
  await db.runAsync(`INSERT OR REPLACE INTO transactions
    (id,amount,currency,type,merchant,category,date,confidence,source,sourcePackage,status,updatedAt,deletedAt,syncedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  row.id, row.amount, row.currency, row.type, row.merchant, row.category, row.date,
  row.confidence, row.source, row.sourcePackage, row.status, row.updatedAt, row.deletedAt, row.syncedAt);
}

export function saveTransaction(parsed: ParsedTransaction, context: {
  id?: string; source: IngestionSource; sourcePackage?: string | null; status?: 'review' | 'confirmed';
}): Promise<Transaction> {
  return write(async (db) => {
    parsed = validateParsedTransaction(parsed);
    const id = context.id ?? randomUUID();
    const existing = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', id);
    // A crash after saving but before queue acknowledgement must not overwrite a later user edit.
    if (existing) return existing;
    const row: Transaction = {
      ...parsed, id, source: context.source, sourcePackage: context.sourcePackage ?? null,
      status: context.status ?? 'review', updatedAt: Date.now(), deletedAt: null, syncedAt: null,
    };
    await put(db, row);
    return row;
  });
}

export function updateTransaction(row: Transaction): Promise<void> {
  return write(async (db) => {
    const parsed = validateParsedTransaction({ amount: row.amount, currency: row.currency, type: row.type,
      merchant: row.merchant, category: row.category, date: row.date, confidence: row.confidence });
    const existing = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', row.id);
    if (!existing || existing.deletedAt !== null) throw new Error('Giao dịch không còn tồn tại.');
    await put(db, { ...row, ...parsed, updatedAt: Math.max(Date.now(), existing.updatedAt + 1), syncedAt: null });
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return write(async (db) => {
    const now = Date.now();
    await db.runAsync('UPDATE transactions SET deletedAt = ?, updatedAt = MAX(?, updatedAt + 1), syncedAt = NULL WHERE id = ? AND deletedAt IS NULL', now, now, id);
  });
}

export function enqueueAlert(alert: QueuedAlert): Promise<void> {
  return write(async (db) => {
    const done = await db.getFirstAsync('SELECT id FROM processed_alerts WHERE id = ?', alert.id);
    if (done) return;
    await db.runAsync('INSERT OR IGNORE INTO alert_queue (id,text,imageUri,source,sourcePackage,receivedAt,error) VALUES (?,?,?,?,?,?,?)',
      alert.id, alert.text, alert.imageUri, alert.source, alert.sourcePackage, alert.receivedAt, alert.error);
  });
}

export async function listQueuedAlerts(): Promise<QueuedAlert[]> {
  return (await database()).getAllAsync<QueuedAlert>('SELECT * FROM alert_queue ORDER BY receivedAt ASC');
}

export function removeQueuedAlert(id: string): Promise<void> {
  return write(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT OR IGNORE INTO processed_alerts (id,receivedAt) VALUES (?,?)', id, Date.now());
      await db.runAsync('DELETE FROM alert_queue WHERE id = ?', id);
    });
  });
}

export function setQueueError(id: string, error: string): Promise<void> {
  return write(async (db) => { await db.runAsync('UPDATE alert_queue SET error = ? WHERE id = ?', error, id); });
}

export async function getSetting(key: string): Promise<string | null> {
  return (await (await database()).getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key))?.value ?? null;
}

export function setSetting(key: string, value: string): Promise<void> {
  return write(async (db) => { await db.runAsync('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', key, value); });
}

export async function listSyncTransactions(): Promise<Transaction[]> {
  return (await database()).getAllAsync<Transaction>("SELECT * FROM transactions WHERE syncedAt IS NULL AND (status = 'confirmed' OR deletedAt IS NOT NULL)");
}

export function mergeRemoteTransactions(rows: Transaction[]): Promise<void> {
  return write(async (db) => {
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        const local = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', row.id);
        if (!local || row.updatedAt > local.updatedAt || (row.updatedAt === local.updatedAt && local.syncedAt !== null)) {
          await put(db, { ...row, syncedAt: Date.now() });
        }
      }
    });
  });
}

export function markSynced(id: string, updatedAt: number): Promise<void> {
  return write(async (db) => {
    await db.runAsync('UPDATE transactions SET syncedAt = ? WHERE id = ? AND updatedAt = ?', Date.now(), id, updatedAt);
  });
}

export function claimSyncOwner(uid: string): Promise<void> {
  return write(async (db) => {
    const owner = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'syncOwner');
    if (owner && owner.value !== uid) throw new Error('Dữ liệu trên thiết bị thuộc tài khoản khác. Đăng nhập lại tài khoản ban đầu để đồng bộ.');
    if (!owner) await db.runAsync('INSERT INTO settings (key,value) VALUES (?,?)', 'syncOwner', uid);
  });
}
