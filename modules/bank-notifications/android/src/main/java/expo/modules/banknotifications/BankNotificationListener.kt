package expo.modules.banknotifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.text.Normalizer
import java.util.Locale

class BankNotificationListener : NotificationListenerService() {
  companion object {
    private val excluded = Regex("\\b(otp|one[ -]time|verification code|security code|ma xac thuc|ma xac nhan|ma bao mat|khuyen mai|uu dai|giam gia|cashback|promotion|voucher|offer)\\b")
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    CaptureStore.expire(this)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    // Do not even inspect notification text before persisted consent and exact package match.
    if (!CaptureStore.accepts(this, sbn.packageName)) return
    val notification = sbn.notification
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
      ?: extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.joinToString("\n")
      ?: ""
    val text = listOf(title, body).filter { it.isNotBlank() }.distinct().joinToString("\n").take(8192)
    if (text.isBlank()) return
    val folded = Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT).replace('đ', 'd')
    if (excluded.containsMatchIn(folded)) return
    CaptureStore.capture(this, sbn.packageName, sbn.key, text, sbn.postTime)
  }
}
