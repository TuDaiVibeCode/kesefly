import { AppState, Platform } from 'react-native';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';

import { getModelState, parseAlert } from '@/core/ai/engine';
import {
  enqueueAlert, listQueuedAlerts, removeQueuedAlert, saveTransaction, setQueueError,
} from '@/core/database/repository';
import { acknowledgeNativeAlerts, readNativeAlerts } from './nativeCapture';
import { deleteReceipt, persistReceipt } from './receiptFiles';
import { preFilter } from './regexPreFilter';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
let processing: Promise<{ processed: number; failed: number }> | null = null;
let importing: Promise<number> | null = null;

export async function ingestText(text: string, source: 'manual' | 'notification' = 'manual', sourcePackage?: string,
  receivedAt = Date.now(), id?: string): Promise<{ queued: boolean; reason?: string }> {
  const result = preFilter(text);
  if (!result.accepted) return { queued: false, reason: result.reason };
  const key = id ?? await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${source}\n${sourcePackage ?? ''}\n${receivedAt}\n${text}`);
  await enqueueAlert({ id: key, text, imageUri: null, source, sourcePackage: sourcePackage ?? null, receivedAt, error: null });
  return { queued: true };
}

export async function ingestImage(uri: string): Promise<void> {
  const id = randomUUID();
  const imageUri = await persistReceipt(uri, id);
  try {
    await enqueueAlert({ id, text: '', imageUri, source: 'image', sourcePackage: null, receivedAt: Date.now(), error: null });
  } catch (error) {
    await deleteReceipt(imageUri);
    throw error;
  }
}

export function importNativeAlerts(): Promise<number> {
  if (importing) return importing;
  importing = (async () => {
    let imported = 0;
    // Read and acknowledge bounded pages. Capture continues natively while this runs.
    for (;;) {
      const alerts = await readNativeAlerts();
      if (!alerts.length) return imported;
      const acknowledged: string[] = [];
      for (const alert of alerts) {
        if (alert.receivedAt > Date.now() - RETENTION_MS) {
          const result = await ingestText(alert.text, 'notification', alert.packageName, alert.receivedAt, alert.id);
          if (result.queued) imported++;
        }
        acknowledged.push(alert.id);
      }
      await acknowledgeNativeAlerts(acknowledged);
    }
  })().finally(() => { importing = null; });
  return importing;
}

export async function discardAlert(id: string): Promise<void> {
  const row = (await listQueuedAlerts()).find((alert) => alert.id === id);
  // Delete the private file first: failure must leave an actionable queue entry.
  if (row) await deleteReceipt(row.imageUri);
  await removeQueuedAlert(id);
}

export async function purgeExpiredAlerts(): Promise<void> {
  const cutoff = Date.now() - RETENTION_MS;
  for (const row of await listQueuedAlerts()) {
    if (row.receivedAt <= cutoff) await discardAlert(row.id);
  }
}

export async function discardCapturedAlerts(): Promise<void> {
  for (const row of await listQueuedAlerts()) if (row.source === 'notification') await discardAlert(row.id);
}

export function processQueue(): Promise<{ processed: number; failed: number }> {
  if (processing) return processing;
  processing = (async () => {
    await purgeExpiredAlerts();
    if (getModelState().phase !== 'ready') throw new Error('Hãy tải và mở model local trong Cài đặt trước khi phân tích.');
    let processed = 0, failed = 0;
    for (const alert of await listQueuedAlerts()) {
      if ((Platform.OS !== 'web' && AppState.currentState !== 'active') || getModelState().phase !== 'ready') break;
      try {
        const parsed = await parseAlert(alert);
        await saveTransaction(parsed, { id: alert.id, source: alert.source, sourcePackage: alert.sourcePackage, status: 'review' });
        await discardAlert(alert.id);
        processed++;
      } catch {
        // Never persist native/model errors: they may echo financial input or extracted values.
        await setQueueError(alert.id, 'Chưa phân tích được. Kiểm tra model, thử lại hoặc nhập giao dịch thủ công.');
        failed++;
      }
    }
    return { processed, failed };
  })().finally(() => { processing = null; });
  return processing;
}
