package expo.modules.banknotifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import java.io.File
import java.security.MessageDigest

/** One process-wide lock makes revocation atomic against listener writes and JS reads. */
internal object CaptureStore {
  private const val RETENTION_MS = 7L * 24 * 60 * 60 * 1000
  private val packagePattern = Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")

  private fun database(context: Context): SQLiteDatabase {
    val db = SQLiteDatabase.openOrCreateDatabase(File(context.noBackupFilesDir, "bank-capture.db"), null)
    db.execSQL("PRAGMA secure_delete=ON")
    db.execSQL("CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY CHECK(id=1), consent INTEGER NOT NULL)")
    db.execSQL("CREATE TABLE IF NOT EXISTS packages (name TEXT PRIMARY KEY)")
    db.execSQL("CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, text TEXT NOT NULL, package_name TEXT NOT NULL, received_at INTEGER NOT NULL)")
    db.execSQL("CREATE INDEX IF NOT EXISTS alerts_age ON alerts(received_at)")
    return db
  }

  private fun consent(db: SQLiteDatabase): Boolean = db.rawQuery("SELECT consent FROM config WHERE id=1", null).use { it.moveToFirst() && it.getInt(0) == 1 }
  private fun packages(db: SQLiteDatabase): List<String> = db.rawQuery("SELECT name FROM packages ORDER BY name", null).use { cursor ->
    buildList { while (cursor.moveToNext()) add(cursor.getString(0)) }
  }
  private fun prune(db: SQLiteDatabase) {
    db.delete("alerts", "received_at <= ? OR received_at > ?", arrayOf((System.currentTimeMillis() - RETENTION_MS).toString(), System.currentTimeMillis().toString()))
  }

  @Synchronized fun configure(context: Context, allowed: Boolean, names: List<String>) {
    require(names.size <= 100 && names.all { it.length <= 255 && packagePattern.matches(it) }) { "Use exact Android package identifiers, without wildcards." }
    database(context).use { db ->
      db.beginTransaction()
      try {
        db.execSQL("INSERT OR REPLACE INTO config(id,consent) VALUES(1,?)", arrayOf(if (allowed) 1 else 0))
        db.delete("packages", null, null)
        names.distinct().forEach { name -> db.execSQL("INSERT INTO packages(name) VALUES(?)", arrayOf(name)) }
        if (!allowed) db.delete("alerts", null, null)
        else {
          // Removing a package also removes its unimported raw notifications.
          db.execSQL("DELETE FROM alerts WHERE package_name NOT IN (SELECT name FROM packages)")
          prune(db)
        }
        db.setTransactionSuccessful()
      } finally { db.endTransaction() }
      schedule(context, db)
    }
  }

  @Synchronized fun accepts(context: Context, name: String): Boolean = database(context).use { db ->
    prune(db)
    consent(db) && db.rawQuery("SELECT 1 FROM packages WHERE name=?", arrayOf(name)).use { it.moveToFirst() }
  }

  @Synchronized fun capture(context: Context, name: String, key: String, text: String, postedAt: Long) {
    database(context).use { db ->
      prune(db)
      if (!consent(db) || !db.rawQuery("SELECT 1 FROM packages WHERE name=?", arrayOf(name)).use { it.moveToFirst() }) return
      val now = System.currentTimeMillis()
      if (postedAt <= now - RETENTION_MS || postedAt > now) return
      val digest = MessageDigest.getInstance("SHA-256").digest("$key\u0000$postedAt\u0000$text".toByteArray(Charsets.UTF_8))
      val id = digest.joinToString("") { "%02x".format(it) }
      db.insertWithOnConflict("alerts", null, ContentValues().apply {
        put("id", id); put("text", text); put("package_name", name); put("received_at", postedAt)
      }, SQLiteDatabase.CONFLICT_IGNORE)
      schedule(context, db)
    }
  }

  @Synchronized fun read(context: Context): List<Map<String, Any>> = database(context).use { db ->
    prune(db)
    if (!consent(db)) { db.delete("alerts", null, null); return emptyList() }
    db.rawQuery("SELECT id,text,package_name,received_at FROM alerts ORDER BY received_at LIMIT 200", null).use { cursor ->
      buildList { while (cursor.moveToNext()) add(mapOf("id" to cursor.getString(0), "text" to cursor.getString(1), "packageName" to cursor.getString(2), "receivedAt" to cursor.getLong(3))) }
    }
  }

  @Synchronized fun status(context: Context, enabled: Boolean): Map<String, Any> = database(context).use { db ->
    prune(db)
    val count = db.rawQuery("SELECT COUNT(*) FROM alerts", null).use { it.moveToFirst(); it.getInt(0) }
    mapOf("enabled" to enabled, "consent" to consent(db), "packages" to packages(db), "pending" to count)
  }

  @Synchronized fun acknowledge(context: Context, ids: List<String>) {
    database(context).use { db ->
      db.beginTransaction()
      try { ids.forEach { db.delete("alerts", "id=?", arrayOf(it)) }; prune(db); db.setTransactionSuccessful() }
      finally { db.endTransaction() }
      schedule(context, db)
    }
  }

  @Synchronized fun expire(context: Context) { database(context).use { db -> prune(db); schedule(context, db) } }

  private fun schedule(context: Context, db: SQLiteDatabase) {
    val alarm = context.getSystemService(AlarmManager::class.java)
    val intent = PendingIntent.getBroadcast(context, 0, Intent(context, RetentionReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val oldest = db.rawQuery("SELECT MIN(received_at) FROM alerts", null).use { if (it.moveToFirst() && !it.isNull(0)) it.getLong(0) else null }
    if (oldest == null) alarm.cancel(intent)
    else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, oldest + RETENTION_MS, intent)
  }
}
