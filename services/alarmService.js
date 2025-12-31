/**
 * Alarm Service - Notifee ile güçlendirilmiş alarm yönetimi
 * Android: Full-screen alarm desteği
 * iOS: Time-sensitive bildirimler
 */

import notifee, { AndroidImportance, EventType, Event, TriggerType } from '@notifee/react-native';
import { Platform, AppState, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android Alarm Channel ID
const ALARM_CHANNEL_ID = 'alarm_channel';

/**
 * Notifee bildirim izinlerini kontrol et ve iste
 */
export const requestNotifeePermissions = async () => {
  try {
    // Bildirim izinlerini kontrol et
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus === 0) {
      // İzin verilmemiş, iste
      const result = await notifee.requestPermission();
      if (result.authorizationStatus !== 1) {
        console.warn('⚠️ Bildirim izni verilmedi');
        return false;
      }
    }
    
    console.log('✅ Notifee izinleri kontrol edildi');
    return true;
  } catch (error) {
    console.error('❌ Notifee izin kontrolü hatası:', error);
    // Hata olsa bile devam et (bazı platformlarda bu fonksiyonlar olmayabilir)
    return true;
  }
};

/**
 * Android alarm channel'ını oluştur
 */
export const createAlarmChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Kalkma Alarmı',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [500, 200, 500, 200, 500, 200], // Çift sayıda pozitif değer (6 eleman)
    });
    console.log('✅ Android alarm channel oluşturuldu');
  }
};

/**
 * Alarm bildirimi göster (Android full-screen, iOS time-sensitive)
 */
export const displayAlarmNotification = async (options = {}) => {
  const {
    title = 'Kalkma Zamanı! 🚶',
    body = 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
    data = {},
  } = options;

  // İzinleri kontrol et
  const hasPermission = await requestNotifeePermissions();
  if (!hasPermission) {
    console.warn('⚠️ Notifee izinleri yok, bildirim gösterilemiyor');
    return null;
  }

  // Android için full-screen alarm
  const androidConfig = Platform.OS === 'android' ? {
    channelId: ALARM_CHANNEL_ID,
    importance: AndroidImportance.HIGH,
    fullScreenAction: {
      id: 'default',
    },
    pressAction: {
      id: 'default',
    },
    sound: 'default',
      vibrationPattern: [500, 200, 500, 200, 500, 200], // Çift sayıda pozitif değer (6 eleman)
    ongoing: true, // Kullanıcı kapatamaz
    autoCancel: false,
  } : {};

  // iOS için time-sensitive bildirim
  const iosConfig = Platform.OS === 'ios' ? {
    sound: 'default',
    interruptionLevel: 'timeSensitive', // iOS 15+ için kritik bildirim
    foregroundPresentationOptions: {
      alert: true,
      badge: true,
      sound: true,
    },
  } : {};

  try {
    const notificationId = await notifee.displayNotification({
      title,
      body,
      data: {
        type: 'standup',
        screen: 'Alarm',
        ...data,
      },
      android: androidConfig,
      ios: iosConfig,
    });

    console.log('✅ Notifee alarm bildirimi gösterildi:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Notifee alarm bildirimi gösterilemedi:', error);
    if (error.message) {
      console.error('Hata mesajı:', error.message);
    }
    throw error;
  }
};

/**
 * Alarm bildirimini iptal et
 */
export const cancelAlarmNotification = async (notificationId) => {
  try {
    if (notificationId) {
      await notifee.cancelNotification(notificationId);
      console.log('✅ Alarm bildirimi iptal edildi:', notificationId);
    } else {
      // Tüm alarm bildirimlerini iptal et
      await notifee.cancelAllNotifications();
      console.log('✅ Tüm alarm bildirimleri iptal edildi');
    }
  } catch (error) {
    console.error('❌ Alarm bildirimi iptal edilemedi:', error);
  }
};

/**
 * Alarm bildirimi planla (gelecek için)
 */
export const scheduleAlarmNotification = async (triggerDate, options = {}) => {
  const {
    title = 'Kalkma Zamanı! 🚶',
    body = 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
    data = {},
  } = options;

  // İzinleri kontrol et
  const hasPermission = await requestNotifeePermissions();
  if (!hasPermission) {
    console.warn('⚠️ Notifee izinleri yok, bildirim planlanamıyor');
    return null;
  }

  // Android için full-screen alarm
  const androidConfig = Platform.OS === 'android' ? {
    channelId: ALARM_CHANNEL_ID,
    importance: AndroidImportance.HIGH,
    fullScreenAction: {
      id: 'default',
    },
    pressAction: {
      id: 'default',
    },
    sound: 'default',
      vibrationPattern: [500, 200, 500, 200, 500, 200], // Çift sayıda pozitif değer (6 eleman)
    ongoing: true, // Kullanıcı kapatamaz
    autoCancel: false,
  } : {};

  // iOS için time-sensitive bildirim
  const iosConfig = Platform.OS === 'ios' ? {
    sound: 'default',
    interruptionLevel: 'timeSensitive',
  } : {};

  try {
    const notificationId = await notifee.createTriggerNotification(
      {
        title,
        body,
        data: {
          type: 'standup',
          screen: 'Alarm',
          ...data,
        },
        android: androidConfig,
        ios: iosConfig,
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerDate.getTime(),
      }
    );

    console.log('✅ Notifee alarm bildirimi planlandı:', notificationId, 'Tarih:', triggerDate.toISOString());
    return notificationId;
  } catch (error) {
    console.error('❌ Notifee alarm bildirimi planlanamadı:', error);
    // Hata detaylarını logla
    if (error.message) {
      console.error('Hata mesajı:', error.message);
    }
    throw error;
  }
};

/**
 * Bildirim event handler'larını kur
 */
export const setupNotificationHandlers = (onAlarmPress) => {
  // Foreground event (uygulama açıkken)
  notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      const notificationData = detail.notification?.data;
      if (notificationData?.type === 'standup' || notificationData?.screen === 'Alarm') {
        console.log('📱 Alarm bildirimi tıklandı (foreground)');
        // Alarm ekranını aç
        if (onAlarmPress) {
          setTimeout(() => {
            onAlarmPress();
          }, 300);
        }
      }
    }
  });

  // Background event (uygulama arka planda)
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      const notificationData = detail.notification?.data;
      if (notificationData?.type === 'standup' || notificationData?.screen === 'Alarm') {
        console.log('📱 Alarm bildirimi tıklandı (background)');
        // Alarm durumunu AsyncStorage'a kaydet
        try {
          const alarmData = {
            alarmId: `alarm_${Date.now()}`,
            fireTime: Date.now(),
            type: 'SITTING_ALARM',
            snoozeCount: notificationData.snoozeCount || 0,
            firstSittingDuration: notificationData.firstSittingDuration || null,
            totalSittingDuration: notificationData.totalSittingDuration || null,
          };
          await AsyncStorage.setItem('ACTIVE_ALARM', JSON.stringify(alarmData));
          console.log('✅ Alarm durumu AsyncStorage\'a kaydedildi (background)');
        } catch (error) {
          console.error('❌ Alarm durumu kaydedilemedi:', error);
        }
      }
    }
  });

  console.log('✅ Bildirim handler\'ları kuruldu');
};

