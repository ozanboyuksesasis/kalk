/**
 * Android Foreground Timer Service
 * Uygulama recentlerden silinse bile timer çalışmaya devam eder
 * ve süre dolunca bildirim gönderir.
 */

import { NativeModules, Platform } from 'react-native';

const { TimerModule } = NativeModules;

const isAvailable = Platform.OS === 'android' && !!TimerModule;

/**
 * Foreground timer'ı başlat.
 * @param {number} targetTimestamp - ms cinsinden hedef zaman (Date.now() + kalan_ms)
 * @param {string} title - Alarm bildirim başlığı
 * @param {string} body  - Alarm bildirim içeriği
 */
export const startForegroundTimer = (targetTimestamp, title, body) => {
  if (!isAvailable) return;
  try {
    TimerModule.startForegroundTimer(targetTimestamp, title, body);
    console.log('✅ Foreground timer başlatıldı:', new Date(targetTimestamp).toLocaleTimeString('tr-TR'));
  } catch (e) {
    console.error('❌ Foreground timer başlatılamadı:', e);
  }
};

/**
 * Foreground timer'ı durdur (timer iptal edildiğinde veya alarm kapandığında).
 */
export const stopForegroundTimer = () => {
  if (!isAvailable) return;
  try {
    TimerModule.stopForegroundTimer();
    console.log('⏹ Foreground timer durduruldu');
  } catch (e) {
    console.error('❌ Foreground timer durdurulamadı:', e);
  }
};

/**
 * Foreground bildirimini göster (uygulama arka plana geçince).
 */
export const showTimerNotification = () => {
  if (!isAvailable) return;
  try {
    TimerModule.showTimerNotification();
  } catch (e) {
    console.error('❌ showTimerNotification:', e);
  }
};

/**
 * Foreground bildirimini gizle (uygulama ön plana gelince veya timer başlarken).
 */
export const hideTimerNotification = () => {
  if (!isAvailable) return;
  try {
    TimerModule.hideTimerNotification();
  } catch (e) {
    console.error('❌ hideTimerNotification:', e);
  }
};
