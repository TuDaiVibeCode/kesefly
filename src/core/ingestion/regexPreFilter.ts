export function preFilter(text: string): { accepted: boolean; reason?: string } {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  if (!text.trim()) return { accepted: false, reason: 'Nội dung trống.' };
  if (text.length > 6000) return { accepted: false, reason: 'Nội dung quá dài (tối đa 6.000 ký tự).' };
  if (/\botp\b|one.time.password|ma xac (?:thuc|nhan)|verification code/.test(normalized)) {
    return { accepted: false, reason: 'Đã bỏ qua mã xác thực / OTP.' };
  }
  if (/\b(?:USD|EUR|GBP|JPY|THB|SGD|AUD|CAD)\b|[$€£¥]/i.test(text)) {
    return { accepted: false, reason: 'Hiện chỉ hỗ trợ giao dịch VND; hãy nhập thủ công nếu cần quy đổi.' };
  }
  const transaction = /(?:[+-]\s*[\d.,]+\s*(?:vnd|d|₫))|(?:giao dich|thanh toan|chuyen (?:tien|khoan)|bien dong|ghi (?:no|co)|so du|\bsd\b|\bgd\b|\bdebit\b|\bcredit\b|payment|received|spent)/.test(normalized);
  const amount = /\d[\d.,\s]*(?:vnd|vnđ|₫|dong)|(?:vnd|vnđ|₫)\s*[+-]?\s*\d|[+-]\s*\d[\d.,]*/i.test(text);
  if (/khuyen mai|uu dai|giam gia|cashback|promotion|offer/.test(normalized) && !transaction) {
    return { accepted: false, reason: 'Đã bỏ qua thông báo ưu đãi.' };
  }
  if (!transaction || !amount) return { accepted: false, reason: 'Chưa nhận ra thông báo giao dịch VND. Bạn có thể nhập giao dịch thủ công.' };
  return { accepted: true };
}
