import { AI_CONSENT_VERSION, type ParseTransactionRequest } from '../../types/ai';
import type { ParsedTransaction, QueuedAlert } from '../../types/transaction';
import {
  assertFirebaseAISession,
  getFirebaseAIAuth,
  getFirebaseAISession,
  isCloudAIConfigured,
  readCloudAIConsent,
  writeCloudAIConsent,
  type FirebaseAISession,
} from '../firebase/cloud';
import { getAIEndpoint } from './endpoint';
import { buildImagePayload } from './imagePayload';
import { validateParsedTransaction } from './validation';

export type AISession = FirebaseAISession;

const ERROR_MESSAGES = {
  AI_CONFIGURATION: 'Chưa cấu hình dịch vụ AI. Bạn vẫn có thể nhập và lưu giao dịch thủ công.',
  AI_AUTH_REQUIRED: 'Đăng nhập trước khi gửi dữ liệu cho AI.',
  AI_CONSENT_REQUIRED: 'Hãy cho phép gửi dữ liệu qua máy chủ Express của nhóm phát triển đến OpenAI trong Cài đặt trước khi dùng AI.',
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

const BACKEND_STATUS: Partial<Record<AIErrorCode, number>> = {
  AI_AUTH_REQUIRED: 401, AI_CONSENT_REQUIRED: 403, AI_INPUT_INVALID: 400,
  AI_UNAVAILABLE: 503, REQUEST_PENDING: 409, REQUEST_ID_CONFLICT: 409,
  REQUEST_FAILED: 502, REQUEST_EXPIRED: 410, QUOTA_EXCEEDED: 429,
};

/** Only allowlisted codes cross this boundary, never raw SDK/provider messages. */
function safeError(error: unknown): AIClientError {
  if (error instanceof AIClientError) return error;
  if (error instanceof Error && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, error.message)) {
    return new AIClientError(error.message as AIErrorCode);
  }
  if (error && typeof error === 'object') {
    const code = 'code' in error ? error.code : undefined;
    if (code === 'auth/network-request-failed') return new AIClientError('AI_NETWORK');
    if (code === 'auth/user-token-expired' || code === 'auth/invalid-user-token' ||
        code === 'auth/user-disabled') return new AIClientError('AI_AUTH_REQUIRED');
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
  const endpoint = getAIEndpoint();
  if (!isAIConfigured() || !endpoint) throw new AIClientError('AI_CONFIGURATION');
  try {
    const session = await getFirebaseAISession();
    // Auth restoration, consent, and the sticky device owner must settle before
    // touching a private image or issuing an HTTP request.
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
    const user = getFirebaseAIAuth().currentUser;
    if (!user || user.uid !== session.uid) throw new AIClientError('AI_SESSION_CHANGED');
    await assertAISession(session);
    const token = await user.getIdToken();
    await assertAISession(session);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    let data: unknown;
    try {
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(request),
          signal: controller.signal,
          redirect: 'error',
          credentials: 'omit',
          cache: 'no-store',
        });
      } catch { throw new AIClientError('AI_NETWORK'); }
      await assertAISession(session);
      if (response.redirected) throw new AIClientError('AI_NETWORK');
      try { data = await response.json(); } catch {
        throw new AIClientError(controller.signal.aborted ? 'AI_NETWORK' :
          response.ok ? 'AI_RESPONSE_INVALID' : 'AI_FAILED');
      }
      await assertAISession(session);
      if (!response.ok) {
        const error = data && typeof data === 'object' && 'error' in data ? data.error : undefined;
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(BACKEND_STATUS, code) &&
            BACKEND_STATUS[code as AIErrorCode] === response.status) throw new AIClientError(code as AIErrorCode);
        throw new AIClientError('AI_FAILED');
      }
    } finally { clearTimeout(timeout); }
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
