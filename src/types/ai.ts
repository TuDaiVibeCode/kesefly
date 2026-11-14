import type { ParsedTransaction } from './transaction';

export const AI_CONSENT_VERSION = 'express-openai-input-v1';
export interface ParseTransactionRequest {
  requestId: string;
  consentVersion: typeof AI_CONSENT_VERSION;
  text: string;
  receivedAt: number;
  image: { base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' } | null;
}
export interface ParseTransactionResponse {
  transaction: ParsedTransaction | null;
}
