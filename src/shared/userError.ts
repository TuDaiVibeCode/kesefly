const translations: readonly (readonly [RegExp, string])[] = [
  [/auth\/(invalid-credential|invalid-login-credentials|wrong-password|user-not-found)/i, 'Email hoặc mật khẩu chưa đúng.'],
  [/auth\/email-already-in-use/i, 'Email này đã có tài khoản. Hãy chọn Đăng nhập.'],
  [/auth\/weak-password/i, 'Mật khẩu cần ít nhất 6 ký tự.'],
  [/auth\/too-many-requests/i, 'Bạn đã thử quá nhiều lần. Chờ một lát rồi thử lại.'],
  [/auth\/(network-request-failed|operation-not-allowed)/i, 'Chưa đăng nhập được. Kiểm tra kết nối mạng rồi thử lại.'],
  [/permission-denied|missing or insufficient permissions/i, 'Tài khoản này không có quyền thực hiện thao tác.'],
  [/unauthenticated|requires recent login|auth\/user-token-expired/i, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'],
  [/network request failed|failed to fetch|network error|unavailable|deadline-exceeded/i, 'Kết nối chưa ổn định. Kiểm tra mạng rồi thử lại.'],
  [/Bank notification capture requires|Private storage protection requires/i, 'Tính năng này chỉ có trong bản cài đặt Kesefly trên Android.'],
  [/sqlite|sql statement|database is locked|unable to open database|no such table|indexeddb/i, 'Chưa mở được sổ trên máy. Hãy thử lại.'],
  [/resource-exhausted|quota exceeded/i, 'Đã dùng hết lượt trong ngày. Thử lại vào ngày mai.'],
];

const vietnamese = /[\u00C0-\u1EF9]/;

/**
 * Keeps user-facing Vietnamese messages intact while replacing raw provider,
 * database, and platform errors with a message an ordinary user can act on.
 */
export function userError(raw: string | null | undefined, fallback = 'Không hoàn tất được thao tác. Vui lòng thử lại.'): string {
  if (!raw) return fallback;
  for (const [pattern, message] of translations) {
    if (pattern.test(raw)) return message;
  }
  return vietnamese.test(raw) ? raw : fallback;
}
