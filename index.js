import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';

// Notifee background event handler (uygulama kapalıyken çalışır)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    const notificationData = detail.notification?.data;
    if (notificationData?.type === 'standup' || notificationData?.screen === 'Alarm') {
      console.log('📱 Alarm bildirimi tıklandı (background/killed)');
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
  
  // Trigger event (zamanlanmış bildirim tetiklendiğinde)
  if (type === EventType.TRIGGER_NOTIFICATION_CREATED) {
    console.log('⏰ Zamanlanmış bildirim tetiklendi:', detail.notification?.id);
  }
});

// App'i kaydet
registerRootComponent(App);

