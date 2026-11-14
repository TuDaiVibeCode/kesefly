import { createHash } from 'node:crypto';
import { ApiError } from './errors';
import { AI_CONSENT_VERSION, type ParseTransactionRequest } from '../../src/types/ai';

export const MAX_TEXT_LENGTH = 6000;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function invalid(): never {
  throw new ApiError('AI_INPUT_INVALID');
}

function matchesImage(bytes: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR';
  return mime === 'image/webp' && bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16));
}

export function validateRequest(value: unknown, now: number): ParseTransactionRequest {
  if (!record(value) || !exactKeys(value, ['requestId', 'consentVersion', 'text', 'receivedAt', 'image'])) invalid();
  if (typeof value.requestId !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value.requestId)) invalid();
  if (value.consentVersion !== AI_CONSENT_VERSION) throw new ApiError('AI_CONSENT_REQUIRED');
  if (typeof value.text !== 'string' || value.text.length > MAX_TEXT_LENGTH || /\u0000/.test(value.text)) invalid();
  if (typeof value.receivedAt !== 'number' || !Number.isSafeInteger(value.receivedAt) || value.receivedAt < Date.UTC(2000, 0, 1) || value.receivedAt > now + 5 * 60_000) invalid();
  if (value.image !== null) {
    if (!record(value.image) || !exactKeys(value.image, ['base64', 'mimeType'])) invalid();
    const { base64, mimeType } = value.image;
    if (typeof base64 !== 'string' || !base64.length || base64.length > MAX_BASE64_LENGTH || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) invalid();
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') invalid();
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== base64 || !matchesImage(bytes, mimeType)) invalid();
    return { requestId: value.requestId, consentVersion: AI_CONSENT_VERSION, text: value.text, receivedAt: value.receivedAt, image: { base64, mimeType } };
  }
  if (!value.text.trim()) invalid();
  return { requestId: value.requestId, consentVersion: AI_CONSENT_VERSION, text: value.text, receivedAt: value.receivedAt, image: null };
}

export function payloadDigest(input: ParseTransactionRequest): string {
  return createHash('sha256').update(JSON.stringify([input.consentVersion, input.text, input.receivedAt, input.image?.mimeType ?? null, input.image?.base64 ?? null])).digest('hex');
}

export function requestKey(uid: string, requestId: string): string {
  return createHash('sha256').update(JSON.stringify([uid, requestId])).digest('hex');
}

export function userKey(uid: string): string {
  return createHash('sha256').update(uid).digest('hex');
}
