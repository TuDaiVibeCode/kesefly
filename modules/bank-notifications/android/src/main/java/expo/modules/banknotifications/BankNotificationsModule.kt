package expo.modules.banknotifications

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BankNotificationsModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext) { "Android context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("BankNotifications")
    AsyncFunction("getStatus") {
      val ctx = context
      val manager = ctx.getSystemService(NotificationManager::class.java)
      val component = ComponentName(ctx, BankNotificationListener::class.java)
      val enabled = if (android.os.Build.VERSION.SDK_INT >= 27) manager.isNotificationListenerAccessGranted(component)
      else Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
        ?.split(':')?.any { ComponentName.unflattenFromString(it) == component } == true
      CaptureStore.status(ctx, enabled)
    }
    AsyncFunction("configure") { consent: Boolean, packages: List<String> ->
      CaptureStore.configure(context, consent, packages)
    }
    AsyncFunction("readAlerts") { CaptureStore.read(context) }
    AsyncFunction("acknowledge") { ids: List<String> -> CaptureStore.acknowledge(context, ids) }
    AsyncFunction("openSettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("openBatterySettings") {
      val ctx = context
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try { ctx.startActivity(intent) }
      catch (_: android.content.ActivityNotFoundException) {
        ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
  }
}
