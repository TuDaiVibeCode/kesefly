package expo.modules.banknotifications

import java.text.Normalizer
import java.util.Locale

/**
 * Alert text gating shared by [BankNotificationListener].
 *
 * Two different rules, matching the JS-side `regexPreFilter`:
 * - OTP / verification / security-code text is always excluded — even when the message
 *   carries an amount. Those codes must never reach the AI queue.
 * - Promotional wording ("cashback", "ưu đãi", …) excludes a message only when it looks
 *   like pure promotion. A real transaction whose memo *mentions* cashback still passes;
 *   the JS preFilter's transaction+amount pairing makes the finer call. Dropping it
 *   natively would lose money the user actually spent (PLAN Người1 item 4).
 */
internal object AlertTextFilter {
  // OTP and verification markers: always disqualifying.
  private val otp = Regex("\\b(otp|one[ -]time|verification code|security code|ma xac thuc|ma xac nhan|ma bao mat)\\b")
  // Promotional markers: disqualifying only without transaction evidence.
  private val promo = Regex("\\b(khuyen mai|uu dai|giam gia|cashback|promotion|voucher|offer)\\b")
  // Transaction evidence: balance movement / debit / credit / transfer wording.
  private val transaction = Regex("(giao dich|thanh toan|chuyen (tien|khoan)|bien dong|ghi (no|co)|so du|\\bgd\\b|\\bsd\\b|debit|credit|payment|received|spent)")

  internal fun fold(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFD)
      .replace(Regex("\\p{M}+"), "")
      .lowercase(Locale.ROOT)
      .replace('đ', 'd')

  /** True when the native layer must not queue this text for the AI flow. */
  fun isExcluded(text: String): Boolean {
    val folded = fold(text)
    if (otp.containsMatchIn(folded)) return true
    if (promo.containsMatchIn(folded) && !transaction.containsMatchIn(folded)) return true
    return false
  }
}
