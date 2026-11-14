import { httpsCallable } from 'firebase/functions';
import { AI_CONSENT_VERSION, type ParseTransactionRequest, type ParseTransactionResponse } from '../../types/ai';
import type { ParsedTransaction, QueuedAlert } from '../../types/transaction';
import {
  assertFirebaseAISession,
  getFirebaseAIServices,
  getFirebaseAISession,
  isCloudAIConfigured,
  readCloudAIConsent,
  writeCloudAIConsent,
  type FirebaseAISession,
} from '../firebase/cloud';
import { buildImagePayload } from './imagePayload';
import { validateParsedTransaction } from './validation';

export type AISession = FirebaseAISession;

const ERROR_MESSAGES = {
  AI_CONFIGURATION: 'Chưa cấu hình dịch vụ AI. Bạn vẫn có thể nhập và lưu giao dịch thủ công.',
  AI_AUTH_REQUIRED: 'Đăng nhập trước khi gửi dữ liệu cho AI.',
  AI_CONSENT_REQUIRED: 'Hãy cho phép gửi dữ liệu đến Firebase và OpenAI trong Cài đặt trước khi dùng AI.',
  AI_SESSION_CHANGED: 'Tài khoản hoặc quyền AI đã thay đổi. Đã bỏ kết quả; dữ liệu vẫn ở hàng đợi.',
  AI_OWNER_MISMATCH: 'Dữ liệu trên thiết bị thuộc tài khoản khác. Hãy đăng nhập tài khoản ban đầu.',
  AI_INPUT_INVALID: 'Nội dung phải có văn bản tối đa 6.000 ký tự hoặc ảnh hóa đơn hợp lệ.',
  AI_IMAGE_INVALID: 'Ảnh hóa đơn không hợp lệ. Hãy chọn lại ảnh để lưu bản JPEG riêng tư.',
  AI_IMAGE_MISSING: 'Không tìm thấy ảnh hóa đơn riêng tư. Hãy chọn lại ảnh.',
  AI_IMAGE_TOO_LARGE: 'Ảnh hóa đơn vượt giới hạn 2 MiB. Hãy chọn ảnh nhỏ hơn.',
  AI_RESPONSE_INVALID: 'AI trả về kết quả không hợp lệ. Chưa có giao dịch nào được lưu.',
  AI_NETWORK: 'Không kết nối được dịch vụ AI. Dữ liệu vẫn ở hàng đợi; không tự động gửi lại.',
  AI_FAILED: 'Không thể xử lý bằng AI. Dữ liệu vẫn ở hàng đợi; bạn có thể nhập thủ công.',
  REQUEST_PENDING: 'Yêu cầu này đang hoặc đã được gửi. Không tự động gửi lại để tránh tính phí lặp.',
  REQUEST_EXPIRED: 'Yêu cầu này đã hết hạn. Hãy nhập giao dịch thủ công hoặc chủ động tạo mục mới.',
  REQUEST_ID_CONFLICT: 'Mã yêu cầu không khớp dữ liệu đã gửi. Hãy nhập giao dịch thủ công.',
  REQUEST_FAILED: 'Yêu cầu này không hoàn tất. Không tự động gửi lại; bạn có thể nhập thủ công.',
  QUOTA_EXCEEDED: 'Đã đạt giới hạn sử dụng AI. Bạn vẫn có thể nhập giao dịch thủ công.',
  AI_UNAVAILABLE: 'Dịch vụ AI chưa sẵn sàng. Dữ liệu vẫn được giữ trên thiết bị.',
} as const;

export type AIErrorCode = keyof typeof ERROR_MESSAGES;
export class AIClientError extends Error {
  readonly code: AIErrorCode;
  constructor(code: AIErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'AIClientError';
    this.code = code;
  }
}

const BACKEND_CODES: Partial<Record<AIErrorCode, true>> = {
  REQUEST_PENDING: true, REQUEST_EXPIRED: true, REQUEST_ID_CONFLICT: true,
  REQUEST_FAILED: true, QUOTA_EXCEEDED: true, AI_UNAVAILABLE: true,
};

/** Only allowlisted codes cross this boundary, never raw SDK/provider messages. */
function safeError(error: unknown): AIClientError {
  if (error instanceof AIClientError) return error;
  if (error instanceof Error && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, error.message)) {
    return new AIClientError(error.message as AIErrorCode);
  }
  if (error && typeof error === 'object') {
    const code = 'code' in error ? error.code : undefined;
    const details = 'details' in error ? error.details : undefined;
    const detailCode = details && typeof details === 'object' && 'code' in details ? details.code : undefined;
    if (typeof detailCode === 'string' && Object.prototype.hasOwnProperty.call(BACKEND_CODES, detailCode)) return new AIClientError(detailCode as AIErrorCode);
    switch (code) {
      case 'functions/unauthenticated': return new AIClientError('AI_AUTH_REQUIRED');
      case 'functions/permission-denied': return new AIClientError('AI_CONSENT_REQUIRED');
      case 'functions/resource-exhausted': return new AIClientError('QUOTA_EXCEEDED');
      case 'functions/invalid-argument': return new AIClientError('AI_INPUT_INVALID');
      case 'functions/unavailable':
      case 'functions/deadline-exceeded': return new AIClientError('AI_NETWORK');
      case 'functions/failed-precondition': return new AIClientError('AI_UNAVAILABLE');
      case 'functions/aborted': return new AIClientError('REQUEST_PENDING');
      case 'functions/already-exists': return new AIClientError('REQUEST_ID_CONFLICT');
    }
  }
  return new AIClientError('AI_FAILED');
}

export function isAIConfigured(): boolean { return isCloudAIConfigured(); }

export async function getAIConsent(): Promise<boolean> {
  try { return await readCloudAIConsent(); } catch (error) { throw safeError(error); }
}

export async function setAIConsent(enabled: boolean): Promise<void> {
  if (enabled && !isAIConfigured()) throw new AIClientError('AI_CONFIGURATION');
  try { await writeCloudAIConsent(enabled); } catch (error) { throw safeError(error); }
}

export async function assertAISession(session: AISession): Promise<void> {
  try { await assertFirebaseAISession(session); } catch (error) { throw safeError(error); }
}

export async function parseCloudAlert(alert: QueuedAlert): Promise<{ transaction: ParsedTransaction | null; session: AISession }> {
  if (!isAIConfigured()) throw new AIClientError('AI_CONFIGURATION');
  try {
    const session = await getFirebaseAISession();
    // Auth restoration, consent, and the sticky device owner must settle before
    // touching a private image or issuing a callable request.
    await assertAISession(session);
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(alert.id) || typeof alert.text !== 'string' || alert.text.length > 6000 ||
        (!alert.text.trim() && !alert.imageUri) || !Number.isSafeInteger(alert.receivedAt) ||
        alert.receivedAt < 0 || !Number.isFinite(new Date(alert.receivedAt).getTime())) {
      throw new AIClientError('AI_INPUT_INVALID');
    }
    await assertAISession(session);
    const image = alert.imageUri ? await buildImagePayload(alert.imageUri) : null;
    await assertAISession(session);
    const request: ParseTransactionRequest = {
      requestId: alert.id,
      consentVersion: AI_CONSENT_VERSION,
      text: alert.text,
      receivedAt: alert.receivedAt,
      image,
    };
    const callable = httpsCallable<ParseTransactionRequest, ParseTransactionResponse>(
      getFirebaseAIServices().functions, 'parseTransaction', { timeout: 35_000 },
    );
    const response = await callable(request);
    await assertAISession(session);
    const data: unknown = response.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 1 ||
        !('transaction' in data)) throw new AIClientError('AI_RESPONSE_INVALID');
    let transaction: ParsedTransaction | null;
    try {
      const value = data.transaction;
      transaction = value === null ? null : validateParsedTransaction(value);
    } catch { throw new AIClientError('AI_RESPONSE_INVALID'); }
    await assertAISession(session);
    return { transaction, session };
  } catch (error) { throw safeError(error); }
}
