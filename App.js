import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  AppState,
  SafeAreaView,
  Linking,
  Switch,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Bildirim ayarları - ön plandayken balon gösterme
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const appState = AppState.currentState;
    if (appState === 'active') {
      return {
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Sağlık mesajları (bilimsel dayanaklı)
const getHealthMessage = (minutes) => {
  // Güvenlik kontrolü
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return { message: 'Süre ayarlanmamış', color: '#999' };
  }
  
  if (minutes <= 30) {
    return { message: 'Harika! En sağlıklı oturma zamanı', color: '#4CAF50' };
  } else if (minutes <= 40) {
    return { message: 'İyi! Hala sağlıklı bir süre', color: '#8BC34A' };
  } else if (minutes <= 50) {
    return { message: 'Kabul edilebilir, ancak dikkatli olun', color: '#FFC107' };
  } else if (minutes <= 60) {
    return { message: 'Uzun süreli oturma, bel ağrısı riski artıyor', color: '#FF9800' };
  } else if (minutes <= 90) {
    return { message: 'Çok uzun süre! Bel ağrılarınız olursa şaşırmayın', color: '#FF5722' };
  } else {
    return { message: 'Tehlikeli! Sağlık riskleri çok yüksek', color: '#F44336' };
  }
};

// Süreyi formatla (üstteki açıklayıcı yazı için)
const formatTime = (minutes) => {
  // Güvenlik kontrolü - her zaman string döndür
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
    return '0 sn sonra kalk';
  }
  
  // Eğer dakika değeri ondalıklıysa (örn: 0.5 = 30 saniye)
  if (minutes < 1) {
    const seconds = Math.floor(minutes * 60);
    return `${seconds} sn sonra kalk`;
  } else if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    if (secs > 0) {
      return `${mins} dk ${secs} sn sonra kalk`;
    }
    return `${mins} dk sonra kalk`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (mins === 0) {
      return `${hours} saat sonra kalk`;
    }
    return `${hours} saat ${mins} dk sonra kalk`;
  }
};

// Geri sayım için ayrıntılı format (saat/dk/sn)
const formatCountdown = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds < 0) {
    return '0 sn';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} saat`);
  if (minutes > 0) parts.push(`${minutes} dk`);
  parts.push(`${seconds} sn`);

  return parts.join(' ');
};

export default function App() {
  const [duration, setDuration] = useState(0); // dakika cinsinden (başlangıç 0)
  const [timeLeft, setTimeLeft] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarm, setIsAlarm] = useState(false);
  const [initialDuration, setInitialDuration] = useState(null); // Başlatıldığında ayarlanan süre
  const [snoozeDuration, setSnoozeDuration] = useState(5); // erteleme süresi (dakika)
  const [maxSnoozes, setMaxSnoozes] = useState(3); // maksimum erteleme sayısı
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  
  const intervalRef = useRef(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(null); // Zamanlayıcı başladığında zamanı sakla
  const initialDurationRef = useRef(null); // Başlangıç süresini sakla
  const appStateRef = useRef(AppState.currentState);

  // Ayarları yükle ve notification channel oluştur
  useEffect(() => {
    loadSettings();
    requestPermissions();
    
    // Android için notification channel oluştur
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Kalk Hatırlatıcı',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
  }, []);

  const loadSettings = async () => {
    try {
      // Başlangıç süresini sıfırla - eski değeri yükleme
      // const savedDuration = await AsyncStorage.getItem('duration');
      const savedSnoozeDuration = await AsyncStorage.getItem('snoozeDuration');
      const savedMaxSnoozes = await AsyncStorage.getItem('maxSnoozes');
      
      // if (savedDuration) setDuration(parseInt(savedDuration));
      setDuration(0); // Her zaman 0'dan başla
      if (savedSnoozeDuration) setSnoozeDuration(parseInt(savedSnoozeDuration));
      if (savedMaxSnoozes) setMaxSnoozes(parseInt(savedMaxSnoozes));
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
      setDuration(0); // Hata durumunda da 0'dan başla
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('duration', duration.toString());
      await AsyncStorage.setItem('snoozeDuration', snoozeDuration.toString());
      await AsyncStorage.setItem('maxSnoozes', maxSnoozes.toString());
    } catch (error) {
      console.error('Ayarlar kaydedilemedi:', error);
    }
  };

  // Bildirim izinlerini ayarlar ekranından yönetmek için yardımcı fonksiyonlar
  const checkNotificationPermissions = async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      setNotificationStatus(settings?.status || null);
      Alert.alert(
        'Bildirim izni',
        `Şu anki bildirim izni durumu: ${settings?.status || 'bilinmiyor'}.`,
      );
    } catch (e) {
      console.error('Bildirim izni durumu alınamadı:', e);
      Alert.alert(
        'Bildirim izni',
        'Bildirim izni durumu alınamadı. Lütfen daha sonra tekrar dene.',
      );
    }
  };

  const requestNotificationPermissionsAgain = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationStatus(status);
      if (status === 'granted') {
        Alert.alert(
          'Bildirim izni',
          'Bildirim izni verildi. Arka planda kalkma uyarıları gönderilebilecek. ✅',
        );
      } else {
        Alert.alert(
          'Bildirim izni',
          'Bildirim izni verilemedi. İstersen cihaz ayarlarından daha sonra açabilirsin.',
        );
      }
    } catch (e) {
      console.error('Bildirim izni yeniden istenirken hata:', e);
      Alert.alert(
        'Bildirim izni',
        'Bildirim izni istenirken bir hata oluştu. Lütfen daha sonra tekrar dene.',
      );
    }
  };

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error('Sistem ayarları açılamadı:', e);
      Alert.alert(
        'Sistem ayarları',
        'Sistem ayarları açılamadı. Lütfen cihaz ayarlarından uygulamayı elle aç ve izinleri güncelle.',
      );
    }
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationStatus(status);
    if (status !== 'granted') {
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Bildirim izni gerekli',
          'Arka planda kalkma uyarısı gönderebilmemiz için bildirim iznine ihtiyacımız var. Lütfen izin ver.',
        );
      } else {
        // Android'de hata gibi algılanmasın diye sadece logluyoruz
        console.warn('Bildirim izni verilmedi. Arka planda uyarılar çalışmayabilir.');
      }
    }
  };

  // AppState değişikliklerini dinle (arka plan/ön plan)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Uygulama ön plana geldiğinde kalan süreyi hesapla
        if (isRunning && startTimeRef.current && initialDurationRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const remaining = Math.max(0, initialDurationRef.current - elapsed);
          
          if (remaining <= 0) {
            triggerAlarm();
          } else {
            setTimeLeft(remaining);
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Uygulama açıkken görsel geri sayım için zamanlayıcı
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            triggerAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Uygulama arka plana geçtiğinde veya kapandığında notification'ı kontrol et
  useEffect(() => {
    // Uygulama açıkken notification geldiğinde
    const receivedSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      if (notification.request.content.data?.type === 'standup') {
        setIsRunning(false);
        setIsAlarm(true);
        setTimeLeft(0);
        
        // Titreşim
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
        }
      }
    });

    // Uygulama kapalıyken notification'a tıklandığında
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.type === 'standup') {
        setIsRunning(false);
        setIsAlarm(true);
        setTimeLeft(0);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const triggerAlarm = async () => {
    setIsRunning(false);
    setIsAlarm(true);
    setTimeLeft(0);
    startTimeRef.current = null;
    initialDurationRef.current = null;

    // Titreşim - tekrarlayan titreşim
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true); // true = tekrarla
    }

    // Uygulama arka plandayken bildirim göster (ön planda ekran zaten açık)
    const appState = AppState.currentState;
    if (appState !== 'active') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kalkma Zamanı! 🚶',
          body: 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
        },
        trigger: null,
      });
    }
  };

  const startTimer = async () => {
    if (duration > 0) {
      const seconds = Math.floor(duration * 60);
      setTimeLeft(seconds);
      setIsRunning(true);
      setIsAlarm(false);
      setSnoozeCount(0);
      setInitialDuration(duration); // Başlangıç süresini kaydet (dakika cinsinden)
      startTimeRef.current = Date.now(); // Başlangıç zamanını kaydet
      initialDurationRef.current = seconds; // Başlangıç süresini kaydet (saniye cinsinden)
      saveSettings();

      // Arka plan için scheduled notification oluştur
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kalkma Zamanı! 🚶',
          body: 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
          data: { type: 'standup' },
        },
        trigger: {
          seconds: seconds,
        },
      });
    }
  };

  const stopTimer = async () => {
    setIsRunning(false);
    setTimeLeft(null);
    setIsAlarm(false);
    setSnoozeCount(0);
    setInitialDuration(null); // Başlangıç süresini sıfırla
    startTimeRef.current = null;
    initialDurationRef.current = null;
    // Scheduled notification'ları iptal et
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
  };

  const handleStandUp = async () => {
    // Önce titreşimi durdur
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
    await stopTimer();
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSnooze = async () => {
    if (snoozeCount < maxSnoozes) {
      // Önce titreşimi durdur
      if (Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      setSnoozeCount(snoozeCount + 1);
      const seconds = Math.floor(snoozeDuration * 60);
      setTimeLeft(seconds);
      setIsRunning(true);
      setIsAlarm(false);
      setInitialDuration(snoozeDuration); // Erteleme süresini initialDuration olarak ayarla
      startTimeRef.current = Date.now(); // Yeni başlangıç zamanı
      initialDurationRef.current = seconds; // Yeni başlangıç süresi (saniye cinsinden)
      
      // Yeni erteleme için notification planla
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kalkma Zamanı! 🚶',
          body: 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
          data: { type: 'standup' },
        },
        trigger: {
          seconds: seconds,
        },
      });
    }
    // Erteleme hakkı bittiyse artık sadece "Kalktım" butonu gösterilecek,
    // ekstra uyarı göstermeye gerek yok.
  };

  // +/- butonları için handler'lar (test için 30 saniye)
  const handleIncrease = () => {
    if (!isRunning && !isAlarm) {
      setDuration(Math.min(180, duration + 0.5)); // 0.5 dakika = 30 saniye
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(10);
      }
    }
  };

  const handleDecrease = () => {
    if (!isRunning && !isAlarm) {
      setDuration(Math.max(0, duration - 0.5)); // 0.5 dakika = 30 saniye, minimum 0
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(10);
      }
    }
  };

  // Süre değiştiğinde döner düğmeyi animasyonlu olarak döndür
  useEffect(() => {
    const targetRotation = (duration / 10) * 0.3; // 0'dan başlayarak hesapla
    Animated.spring(rotation, {
      toValue: targetRotation,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [duration]);

  const animatedStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [-15, 15],
          outputRange: ['-15rad', '15rad'],
        }),
      },
    ],
  };

  const healthInfo = getHealthMessage(duration);
  // displayTime: Eğer geri sayım varsa saniyeyi dakikaya çevir, yoksa duration'ı kullan
  const displayTime = timeLeft !== null && timeLeft !== undefined 
    ? timeLeft / 60  // Saniyeyi dakikaya çevir (0.5, 1.5 gibi ondalıklı olabilir)
    : (duration !== null && duration !== undefined ? duration : 0);

  // Hangi ekranın gösterileceğini hesapla
  let content;

  if (showSettings) {
    // Ayarlar ekranı
    content = (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
      >
        <View style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Ayarlar</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowSettings(false);
                saveSettings();
              }}
            >
              <Text style={styles.backButtonText}>✓ Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Erteleme Süresi (dakika)</Text>
            <View style={styles.settingControls}>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => setSnoozeDuration(Math.max(1, snoozeDuration - 5))}
              >
                <Text style={styles.settingButtonText}>-5</Text>
              </TouchableOpacity>
              <Text style={styles.settingValue}>{snoozeDuration} dk</Text>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => setSnoozeDuration(Math.min(30, snoozeDuration + 5))}
              >
                <Text style={styles.settingButtonText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Maksimum Erteleme Sayısı</Text>
            <View style={styles.settingControls}>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => setMaxSnoozes(Math.max(1, maxSnoozes - 1))}
              >
                <Text style={styles.settingButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.settingValue}>{maxSnoozes} kez</Text>
              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => setMaxSnoozes(Math.min(10, maxSnoozes + 1))}
              >
                <Text style={styles.settingButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* İzinler listesi */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>İzinler</Text>
            <View style={styles.permissionRow}>
              <Text style={styles.permissionName}>Bildirim izni</Text>
              <View style={styles.permissionRight}>
                <Text
                  style={
                    notificationStatus === 'granted'
                      ? styles.permissionStatusGranted
                      : styles.permissionStatusDenied
                  }
                >
                  {notificationStatus === 'granted' ? 'Açık' : 'Kapalı'}
                </Text>
                <Switch
                  value={notificationStatus === 'granted'}
                  onValueChange={async (value) => {
                    if (value) {
                      await requestNotificationPermissionsAgain();
                    } else {
                      openSystemSettings();
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  } else if (isAlarm) {
    // Alarm ekranı
    content = (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
      >
        <View style={styles.alarmContainer}>
          <Text style={styles.alarmIcon}>🔔</Text>
          <Text style={styles.alarmTitle}>Kalkma Zamanı!</Text>
          <Text style={styles.alarmSubtitle}>
            Uzun süredir oturuyorsunuz{'\n'}
            Kalkıp biraz yürüyün
          </Text>
          
          <View style={styles.alarmControls}>
            {snoozeCount < maxSnoozes && (
              <TouchableOpacity
                style={styles.snoozeButton}
                onPress={handleSnooze}
              >
                <Text style={styles.snoozeButtonText}>
                  {`Ertele (${snoozeDuration}dk)`}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.standUpButton} onPress={handleStandUp}>
              <Text style={styles.standUpButtonText}>Kalktım ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  } else {
    // Ana ekran
    content = (
      <>
        {/* Sabit header */}
        <View style={styles.header}>
          <Text style={styles.title}>Kalk Hatırlatıcı</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Scroll edilebilen içerik */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          bounces={false}
        >
        {/* Çalar Saat İkonu ile Döner Düğme */}
        <View style={styles.dialContainer}>
          <Animated.View style={[styles.dial, animatedStyle]}>
            <View style={styles.dialInner}>
              <Text style={styles.clockIcon}>⏰</Text>
            </View>
          </Animated.View>
            
            {/* +/- Butonları (Test için 30 saniye) */}
            <View style={styles.dialControls}>
              <TouchableOpacity
                style={styles.rotateButton}
                onPress={handleDecrease}
                disabled={isRunning}
              >
                <Text style={styles.rotateButtonText}>-30sn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rotateButton}
                onPress={handleIncrease}
                disabled={isRunning}
              >
                <Text style={styles.rotateButtonText}>+30sn</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Süre Gösterimi */}
          <View style={styles.timeContainer}>
            {!isRunning ? (
              duration <= 0 ? (
                <Text style={styles.timeText}>Kalkış zamanını ayarla</Text>
              ) : (
                <Text style={styles.timeText}>
                  {formatTime(displayTime) || '0 sn sonra kalk'}
                </Text>
              )
            ) : (
              <>
                <Text style={styles.timeText}>
                  {formatTime(initialDuration || duration)} ✓
                </Text>
                <Text style={styles.countdownText}>
                  {formatCountdown(timeLeft)}
                </Text>
              </>
            )}
          </View>

          {/* Sağlık Bilgisi */}
          {duration > 0 && healthInfo && healthInfo.message && (
            <View style={[styles.healthContainer, { backgroundColor: (healthInfo.color || '#999') + '20' }]}>
              <Text style={[styles.healthText, { color: healthInfo.color || '#999' }]}>
                {String(healthInfo.message)}
              </Text>
            </View>
          )}

          {/* Kontrol Butonları */}
          <View style={styles.controls}>
            {!isRunning ? (
              duration > 0 ? (
                <TouchableOpacity style={styles.startButton} onPress={startTimer}>
                  <Text style={styles.startButtonText}>Başlat</Text>
                </TouchableOpacity>
              ) : null
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopTimer}>
                <Text style={styles.stopButtonText}>Durdur</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isAlarm ? "light-content" : "dark-content"} hidden={isAlarm} />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    // Üst alanın tüm ekranlarda stabil kalması için sabit bir boşluk
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 150 : 80, // Gömülü kontrol düğmeleri için daha fazla padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 10,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  dialControls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  rotateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rotateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  dial: {
    width: Math.min(width * 0.65, 220),
    height: Math.min(width * 0.65, 220),
    borderRadius: Math.min(width * 0.325, 110),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    // 3D görünüm için çoklu shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    // İç gölge efekti için border
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dialInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  clockIcon: {
    fontSize: 96,
  },
  dialIndicator: {
    position: 'absolute',
    top: 15,
    width: 5,
    height: 25,
    backgroundColor: '#FF5722',
    borderRadius: 3,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  dialArrows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    position: 'absolute',
  },
  arrowLeft: {
    fontSize: 32,
    color: '#666',
    fontWeight: 'bold',
  },
  arrowRight: {
    fontSize: 32,
    color: '#666',
    fontWeight: 'bold',
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  healthContainer: {
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginVertical: 20,
  },
  healthText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  alarmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    minHeight: height,
  },
  alarmIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  alarmTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 10,
    textAlign: 'center',
  },
  alarmSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  alarmControls: {
    width: '100%',
    gap: 15,
  },
  snoozeButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  snoozeButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  snoozeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  standUpButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  standUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  settingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  settingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settingValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionName: {
    fontSize: 16,
    color: '#333',
  },
  permissionStatusGranted: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  permissionStatusDenied: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
  },
  permissionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

