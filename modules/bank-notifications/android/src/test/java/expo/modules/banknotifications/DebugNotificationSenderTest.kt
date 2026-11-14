package expo.modules.banknotifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM tests for the debug notification producer's message builder.
 *
 * PLAN Người1 item 2: "debug notification producer phải ghi rõ không phải ngân hàng thật"
 * — every produced notification must carry the test marker and never claim a real bank.
 * The producer posts as the Kesefly app itself; capture requires the user to allowlist
 * Kesefly's own package explicitly.
 */
class DebugNotificationSenderTest {

  @Test
  fun `built debug alert always carries the not-a-real-bank marker`() {
    val title = DebugNotificationSender.title("VCB")
    assertTrue(title.contains("Kesefly"))
    assertTrue(title.contains("Test", ignoreCase = true))
    // The raw bank label may appear only as context, never as the sender identity.
    assertFalse(title.startsWith("VCB"))
  }

  @Test
  fun `hostile bank label cannot inject into the title`() {
    val title = DebugNotificationSender.title("VCB\nOTP real bank alert")
    assertFalse(title.contains("\n"))
    assertTrue(title.contains("Kesefly"))
  }

  @Test
  fun `body keeps the transaction payload for the prefilter`() {
    val body = DebugNotificationSender.body("-65,000 VND tai HIGHLANDS. SD 900,000 VND")
    assertEquals("-65,000 VND tai HIGHLANDS. SD 900,000 VND", body)
  }

  @Test
  fun `app's own package passes the native package pattern so the debug flow can be allowlisted`() {
    assertTrue(BankPackageValidator.isValid(DebugNotificationSender.SELF_PACKAGE))
  }
}
