package expo.modules.banknotifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

/**
 * Debug/test helper that posts synthetic bank-style notifications from the Kesefly
 * app itself so the capture pipeline can be exercised on a real device without a
 * real bank app.
 *
 * Every notification is explicitly marked as a Kesefly test alert — it must never
 * look like it comes from a real bank (PLAN Người1 item 2). Capture only picks it
 * up when the user explicitly allowlists Kesefly's own package.
 */
object DebugNotificationSender {
  const val SELF_PACKAGE = "com.kesefly.app"
  private const val CHANNEL_ID = "kesefly-debug-bank-alerts"

  fun title(bankLabel: String): String {
    val safeLabel = bankLabel.replace(Regex("[\\r\\n\\t]+"), " ").trim()
    return "Kesefly Test (không phải ngân hàng thật)${if (safeLabel.isEmpty()) "" else " — $safeLabel"}"
  }

  fun body(transactionText: String): String = transactionText

  fun post(context: Context, bankLabel: String, transactionText: String, notificationId: Int) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Kesefly test bank alerts (not a real bank)", NotificationManager.IMPORTANCE_HIGH),
      )
    }
    val notification = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title(bankLabel))
      .setContentText(body(transactionText))
      .setStyle(Notification.BigTextStyle().bigText(body(transactionText)))
      .setAutoCancel(true)
      .build()
    manager.notify(notificationId, notification)
  }
}
