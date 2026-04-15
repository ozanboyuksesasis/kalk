package com.kalk.app

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TimerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TimerModule"

    /** targetTimestamp: ms cinsinden Unix timestamp (Date.now() ile aynı birim) */
    @ReactMethod
    fun startForegroundTimer(targetTimestamp: Double, title: String, body: String) {
        val intent = Intent(reactContext, TimerForegroundService::class.java).apply {
            action = TimerForegroundService.ACTION_START
            putExtra(TimerForegroundService.EXTRA_TARGET_TIME, targetTimestamp.toLong())
            putExtra(TimerForegroundService.EXTRA_TITLE, title)
            putExtra(TimerForegroundService.EXTRA_BODY, body)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopForegroundTimer() {
        try {
            val intent = Intent(reactContext, TimerForegroundService::class.java)
            reactContext.stopService(intent)
        } catch (e: Exception) {
            // Servis zaten çalışmıyorsa ignore et
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(TimerForegroundService.isRunning)
    }

    @ReactMethod
    fun showTimerNotification() {
        TimerForegroundService.instance?.get()?.showNotif()
    }

    @ReactMethod
    fun hideTimerNotification() {
        TimerForegroundService.notifVisible = false
        TimerForegroundService.instance?.get()?.hideNotif()
    }
}
