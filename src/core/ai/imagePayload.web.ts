import type { ParseTransactionRequest } from '../../types/ai';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const PREFIX = 'data:image/jpeg;base64,';

/** The queue persists normalized JPEG data URLs in SQLite; no fetch/URL transport. */
export async function buildImagePayload(uri: string): Promise<NonNullable<ParseTransactionRequest['image']>> {
  if (!uri.startsWith(PREFIX)) throw new Error('AI_IMAGE_INVALID');
  if (uri.length > PREFIX.length + 4 * Math.ceil(MAX_IMAGE_BYTES / 3)) throw new Error('AI_IMAGE_TOO_LARGE');
  const base64 = uri.slice(PREFIX.length);
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || !base64.startsWith('/9j/')) {
    throw new Error('AI_IMAGE_INVALID');
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  if (base64.length / 4 * 3 - padding > MAX_IMAGE_BYTES) throw new Error('AI_IMAGE_TOO_LARGE');
  return { base64, mimeType: 'image/jpeg' };
}
