package expo.modules.banknotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RetentionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val result = goAsync()
    Thread {
      try { CaptureStore.expire(context.applicationContext) }
      finally { result.finish() }
    }.start()
  }
}
