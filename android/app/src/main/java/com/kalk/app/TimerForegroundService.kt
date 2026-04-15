package com.kalk.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.lang.ref.WeakReference

class TimerForegroundService : Service() {

    companion object {
        const val FOREGROUND_CHANNEL_ID = "timer_foreground_channel"
        const val ALARM_CHANNEL_ID      = "alarm_channel"
        const val FOREGROUND_NOTIF_ID   = 2001
        const val ALARM_NOTIF_ID        = 2002

        const val ACTION_START      = "com.kalk.app.START_TIMER"
        const val ACTION_SHOW_NOTIF = "com.kalk.app.SHOW_NOTIF"
        const val ACTION_HIDE_NOTIF = "com.kalk.app.HIDE_NOTIF"

        const val EXTRA_TARGET_TIME = "TARGET_TIME"
        const val EXTRA_TITLE       = "NOTIF_TITLE"
        const val EXTRA_BODY        = "NOTIF_BODY"

        private const val PREFS_NAME      = "TimerServicePrefs"
        private const val KEY_TARGET_TIME = "targetTime"
        private const val KEY_ALARM_TITLE = "alarmTitle"
        private const val KEY_ALARM_BODY  = "alarmBody"

        @Volatile var isRunning     = false
        /** JS tarafından kontrol edilir: bildirim gösterilsin mi? */
        @Volatile var notifVisible  = false

        /** Servis örneğine doğrudan erişim (TimerModule için) */
        var instance: WeakReference<TimerForegroundService>? = null
    }

    private val handler     = Handler(Looper.getMainLooper())
    private var targetTime  = 0L
    private var alarmTitle  = "Kalkma Zamanı!"
    private var alarmBody   = "Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!"

    // ─── Tick ───────────────────────────────────────────────────────────────
    private val tick = object : Runnable {
        override fun run() {
            val remaining = targetTime - System.currentTimeMillis()
            if (remaining <= 0) {
                fireAlarm()
                clearPrefs()
                stopSelf()
            } else {
                // Sadece bildirim görünürse güncelle
                if (notifVisible) {
                    refreshForegroundNotification(remaining)
                }
                handler.postDelayed(this, 1000)
            }
        }
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────
    override fun onCreate() {
        super.onCreate()
        instance = WeakReference(this)
        createChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                targetTime = intent.getLongExtra(EXTRA_TARGET_TIME, 0L)
                alarmTitle = intent.getStringExtra(EXTRA_TITLE) ?: alarmTitle
                alarmBody  = intent.getStringExtra(EXTRA_BODY)  ?: alarmBody
                savePrefs()
                startTimerInternal()
            }
            ACTION_SHOW_NOTIF -> {
                showNotif()
            }
            ACTION_HIDE_NOTIF -> {
                hideNotif()
            }
            else -> {
                // Crash recovery: SharedPreferences'tan durumu kurtarmaya çalış
                val prefs       = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val savedTarget = prefs.getLong(KEY_TARGET_TIME, 0L)
                if (savedTarget > 0L) {
                    targetTime = savedTarget
                    alarmTitle = prefs.getString(KEY_ALARM_TITLE, alarmTitle) ?: alarmTitle
                    alarmBody  = prefs.getString(KEY_ALARM_BODY,  alarmBody)  ?: alarmBody
                    // Crash sonrası restart'ta her zaman bildirimi göster
                    notifVisible = true
                    startTimerInternal()
                } else {
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(tick)
        isRunning    = false
        notifVisible = false
        instance     = null
        clearPrefs()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Uygulama recentlerden silindiğinde bildirimi göster
        if (isRunning) {
            notifVisible = true
            showNotif()
        }
    }

    // ─── İç fonksiyonlar ────────────────────────────────────────────────────
    private fun startTimerInternal() {
        isRunning = true
        handler.removeCallbacks(tick)

        val remaining = targetTime - System.currentTimeMillis()
        if (remaining > 0) {
            // startForeground ZORUNLU — Android şart koşuyor
            startForeground(FOREGROUND_NOTIF_ID, buildForegroundNotif(remaining))

            // Eğer JS "gizle" dediyse hemen geri al
            if (!notifVisible) {
                stopForegroundCompat(removeNotification = true)
            }

            handler.post(tick)
        } else {
            fireAlarm()
            clearPrefs()
            stopSelf()
        }
    }

    /** Bildirimi göster (uygulama arka plana geçince çağrılır) */
    fun showNotif() {
        if (!isRunning) return
        val remaining = targetTime - System.currentTimeMillis()
        if (remaining <= 0) return
        notifVisible = true
        startForeground(FOREGROUND_NOTIF_ID, buildForegroundNotif(remaining))
    }

    /** Bildirimi gizle (uygulama ön plana gelince çağrılır) */
    fun hideNotif() {
        notifVisible = false
        stopForegroundCompat(removeNotification = true)
    }

    private fun stopForegroundCompat(removeNotification: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(if (removeNotification) STOP_FOREGROUND_REMOVE else STOP_FOREGROUND_DETACH)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(removeNotification)
        }
    }

    private fun savePrefs() {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putLong(KEY_TARGET_TIME,   targetTime)
            .putString(KEY_ALARM_TITLE, alarmTitle)
            .putString(KEY_ALARM_BODY,  alarmBody)
            .apply()
    }

    private fun clearPrefs() {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    }

    // ─── Bildirimler ────────────────────────────────────────────────────────
    private fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java) ?: return

            nm.createNotificationChannel(
                NotificationChannel(
                    FOREGROUND_CHANNEL_ID,
                    "Timer Sayacı",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Timer çalışırken gösterilen sayaç"
                    setShowBadge(false)
                }
            )

            nm.createNotificationChannel(
                NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Kalkma Alarmı",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Kalkma zamanı geldiğinde"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }
            )
        }
    }

    private fun openAppIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildForegroundNotif(remainingMs: Long): Notification {
        val totalSec = remainingMs / 1000
        val min      = totalSec / 60
        val sec      = totalSec % 60
        val timeText = "%d:%02d".format(min, sec)

        return NotificationCompat.Builder(this, FOREGROUND_CHANNEL_ID)
            .setContentTitle("Oturma Sayacı")
            .setContentText("Kalkma zamanı: $timeText")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openAppIntent())
            .build()
    }

    private fun refreshForegroundNotification(remainingMs: Long) {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        nm.notify(FOREGROUND_NOTIF_ID, buildForegroundNotif(remainingMs))
    }

    private fun fireAlarm() {
        isRunning    = false
        notifVisible = false
        val nm = getSystemService(NotificationManager::class.java) ?: return

        val notif = NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
            .setContentTitle(alarmTitle)
            .setContentText(alarmBody)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(openAppIntent(), true)
            .setContentIntent(openAppIntent())
            .setVibrate(longArrayOf(0, 500, 200, 500, 200, 500))
            .build()

        nm.notify(ALARM_NOTIF_ID, notif)
    }
}
