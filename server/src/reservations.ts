import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ParseTransactionResponse } from '../../src/types/ai';
import { ApiError, type ErrorCode } from './errors';
import { userKey } from './input';
import { validateCompletion } from './provider';

export const USER_DAILY_LIMIT = 100;
export const GLOBAL_DAILY_LIMIT = 1000;
export const RESERVED_CENTS_PER_ATTEMPT = 2;
export const LIFETIME_RESERVED_CENTS = 500;
export const CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
export const PENDING_TTL_MS = 2 * 60_000;
export type ReservationDecision = { kind: 'reserved' } | { kind: 'completed'; result: ParseTransactionResponse } | { kind: 'error'; code: ErrorCode };

/** A single persistent instance, with SQLite locking also protecting multiple connections. */
export class ReservationStore {
  private readonly db: DatabaseSync;
  constructor(path: string, private readonly now: () => number = Date.now) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS requests (
        request_key TEXT PRIMARY KEY, digest TEXT NOT NULL, status TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS results (
        request_key TEXT PRIMARY KEY, response TEXT NOT NULL, expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS counters (counter_key TEXT PRIMARY KEY, used INTEGER NOT NULL) STRICT;`);
  }
  close(): void { this.db.close(); }
  private atomic<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  private prune(now: number): void {
    this.db.prepare("UPDATE requests SET status = 'expired', updated_at = ? WHERE status IN ('pending', 'completed') AND expires_at <= ?").run(now, now);
    this.db.prepare('DELETE FROM results WHERE expires_at <= ?').run(now);
  }
  private used(key: string): number {
    const row = this.db.prepare('SELECT used FROM counters WHERE counter_key = ?').get(key);
    if (!row) return 0;
    if (typeof row.used !== 'number' || !Number.isSafeInteger(row.used) || row.used < 0) throw new ApiError('QUOTA_EXCEEDED');
    return row.used;
  }
  reserveRequest(key: string, uid: string, digest: string, providerEnabled: boolean): ReservationDecision {
    return this.atomic(() => {
      const now = this.now();
      this.prune(now);
      const row = this.db.prepare('SELECT * FROM requests WHERE request_key = ?').get(key);
      if (row) {
        if (row.digest !== digest) return { kind: 'error', code: 'REQUEST_ID_CONFLICT' };
        if (row.status === 'failed') return { kind: 'error', code: 'REQUEST_FAILED' };
        if (row.status === 'pending' && typeof row.expires_at === 'number' && row.expires_at > now) return { kind: 'error', code: 'REQUEST_PENDING' };
        const result = this.db.prepare('SELECT * FROM results WHERE request_key = ?').get(key);
        if (row.status === 'completed' && typeof row.expires_at === 'number' && row.expires_at > now && result && typeof result.expires_at === 'number' && result.expires_at > now && typeof result.response === 'string') {
          try { return { kind: 'completed', result: validateCompletion(JSON.parse(result.response) as unknown) }; } catch { /* Corrupt cached output is terminal, never resubmitted. */ }
        }
        this.db.prepare("UPDATE requests SET status = 'expired', updated_at = ? WHERE request_key = ?").run(now, key);
        this.db.prepare('DELETE FROM results WHERE request_key = ?').run(key);
        return { kind: 'error', code: 'REQUEST_EXPIRED' };
      }
      if (!providerEnabled) return { kind: 'error', code: 'AI_UNAVAILABLE' };
      const day = new Date(now).toISOString().slice(0, 10);
      const counters = [`user_${userKey(uid)}_${day}`, `global_${day}`, 'lifetime'];
      const counts = counters.map((counter) => this.used(counter));
      if (counts[0] >= USER_DAILY_LIMIT || counts[1] >= GLOBAL_DAILY_LIMIT || counts[2] + RESERVED_CENTS_PER_ATTEMPT > LIFETIME_RESERVED_CENTS) return { kind: 'error', code: 'QUOTA_EXCEEDED' };
      const update = this.db.prepare('INSERT INTO counters(counter_key, used) VALUES (?, ?) ON CONFLICT(counter_key) DO UPDATE SET used = excluded.used');
      counters.forEach((counter, index) => update.run(counter, counts[index] + (index === 2 ? RESERVED_CENTS_PER_ATTEMPT : 1)));
      this.db.prepare("INSERT INTO requests VALUES (?, ?, 'pending', ?, ?, ?)").run(key, digest, now, now, now + PENDING_TTL_MS);
      return { kind: 'reserved' };
    });
  }
  completeRequest(key: string, digest: string, response: ParseTransactionResponse): boolean {
    const validated = validateCompletion(response);
    return this.atomic(() => {
      const now = this.now();
      this.prune(now);
      const row = this.db.prepare('SELECT * FROM requests WHERE request_key = ?').get(key);
      if (!row || row.digest !== digest || row.status !== 'pending') return false;
      const expires = now + CACHE_TTL_MS;
      this.db.prepare('INSERT INTO results VALUES (?, ?, ?)').run(key, JSON.stringify(validated), expires);
      this.db.prepare("UPDATE requests SET status = 'completed', expires_at = ?, updated_at = ? WHERE request_key = ?").run(expires, now, key);
      return true;
    });
  }
  failRequest(key: string, digest: string): void {
    this.atomic(() => {
      const now = this.now();
      this.prune(now);
      this.db.prepare("UPDATE requests SET status = 'failed', updated_at = ? WHERE request_key = ? AND digest = ? AND status = 'pending'").run(now, key, digest);
    });
  }
}
