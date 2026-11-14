package expo.modules.banknotifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM tests for the shared alert text filter used by [BankNotificationListener].
 *
 * Policy (PLAN Người1 items 3–4):
 * - OTP / verification / security-code alerts are always excluded, even with amounts.
 * - A real transaction that merely mentions "cashback"/"ưu đãi" in its memo must NOT
 *   be excluded at the native layer — the JS-side preFilter decides promo vs. real
 *   transaction with its transaction+amount pairing. Dropping it natively loses money
 *   the user actually spent.
 * - Vietnamese diacritics fold before matching (NFD strip + đ→d).
 */
class AlertTextFilterTest {

  @Test
  fun `otp and verification alerts are excluded even when they carry amounts`() {
    assertTrue(AlertTextFilter.isExcluded("VCB OTP 123456: giao dich 65,000 VND"))
    assertTrue(AlertTextFilter.isExcluded("Ma xac thuc giao dich 65000 VND"))
    assertTrue(AlertTextFilter.isExcluded("Mã bảo mật: 123456"))
    assertTrue(AlertTextFilter.isExcluded("One-Time Password 555001"))
    assertTrue(AlertTextFilter.isExcluded("Security code 882913"))
    assertTrue(AlertTextFilter.isExcluded("verification code: 555"))
  }

  @Test
  fun `promo-only notifications are excluded`() {
    assertTrue(AlertTextFilter.isExcluded("Ưu đãi giảm giá 50% cho thẻ VCB"))
    assertTrue(AlertTextFilter.isExcluded("Nhận voucher 100k khi mua sắm"))
    assertTrue(AlertTextFilter.isExcluded("KHUYEN MAI tang qua thẻ"))
  }

  @Test
  fun `real transaction mentioning cashback in memo still passes`() {
    assertFalse(AlertTextFilter.isExcluded("Thanh toan 125,000 VND. Tich cashback 1,250 VND"))
    assertFalse(AlertTextFilter.isExcluded("GD -65,000 VND tai HIGHLANDS, nhan uu dai 1,000 VND"))
    assertFalse(AlertTextFilter.isExcluded("Chuyen tien 500,000 VND - hoan tien khuyen mai 5,000 VND"))
  }

  @Test
  fun `normalization folds vietnamese diacritics before matching`() {
    assertTrue(AlertTextFilter.isExcluded("Mã Xác Thực: 999888"))
    assertTrue(AlertTextFilter.isExcluded("KHUYẾN MÃI 50%"))
    assertFalse(AlertTextFilter.isExcluded("GD 100,000 VND tai DAI PHAT"))
  }

  @Test
  fun `plain balance movement messages are not excluded`() {
    assertFalse(AlertTextFilter.isExcluded("Biến động số dư: -65,000 VND"))
    assertFalse(AlertTextFilter.isExcluded("TK 123456789 GD +2.500.000 VND"))
    assertFalse(AlertTextFilter.isExcluded("Thanh toán 45,000 VND tại Highlands Coffee"))
  }

  @Test
  fun `group summary flag constant matches the bit the listener checks`() {
    assertEquals(0x200, android.app.Notification.FLAG_GROUP_SUMMARY)
  }
}
