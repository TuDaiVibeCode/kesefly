import { Directory, File, Paths } from 'expo-file-system';
import type { ParseTransactionRequest } from '../../types/ai';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Read only the normalized durable receipt; never transport a file/remote URL. */
export async function buildImagePayload(uri: string): Promise<NonNullable<ParseTransactionRequest['image']>> {
  try {
    const directory = new Directory(Paths.document, 'private-receipts');
    const prefix = directory.uri.replace(/\/$/, '') + '/';
    if (!uri.startsWith(prefix) || !/^[A-Za-z0-9_-]+\.jpg$/.test(uri.slice(prefix.length))) {
      throw new Error('AI_IMAGE_INVALID');
    }
    const file = new File(uri);
    if (!file.exists) throw new Error('AI_IMAGE_MISSING');
    const size = file.size;
    if (!Number.isSafeInteger(size) || size <= 0) throw new Error('AI_IMAGE_INVALID');
    if (size > MAX_IMAGE_BYTES) throw new Error('AI_IMAGE_TOO_LARGE');
    const base64 = await file.base64();
    // Recheck the actual payload as well as the pre-read file size.
    if (base64.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3)) throw new Error('AI_IMAGE_TOO_LARGE');
    if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || !base64.startsWith('/9j/')) {
      throw new Error('AI_IMAGE_INVALID');
    }
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const decodedSize = base64.length / 4 * 3 - padding;
    if (decodedSize > MAX_IMAGE_BYTES) throw new Error('AI_IMAGE_TOO_LARGE');
    if (decodedSize !== size) throw new Error('AI_IMAGE_INVALID');
    return { base64, mimeType: 'image/jpeg' };
  } catch (error) {
    if (error instanceof Error && /^AI_IMAGE_(INVALID|MISSING|TOO_LARGE)$/.test(error.message)) throw error;
    throw new Error('AI_IMAGE_INVALID');
  }
}
