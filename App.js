import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Vibration,
  Animated,
  StatusBar,
  Platform,
  AppState,
  SafeAreaView,
  Linking,
  Alert,
  InteractionManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHealthMessage } from './utils/healthMessages';
import Header from './components/Header';
import Menu from './components/Menu';
import TimerScreen from './components/TimerScreen';
import SettingsScreen from './components/SettingsScreen';
import StatisticsScreen from './components/StatisticsScreen';
import AlarmScreen from './components/AlarmScreen';
import GenderSelection from './components/GenderSelection';
import ProfileScreen from './components/ProfileScreen';
import CustomAlert, { showAlert } from './components/CustomAlert';

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isStandupNotification = notification.request.content.data?.type === 'standup';
    const appState = AppState.currentState;
    
    // Ayarlardan ses durumunu oku
    let enableSound = true; // Varsayılan olarak açık
    try {
      const savedEnableSound = await AsyncStorage.getItem('enableSound');
      if (savedEnableSound !== null) {
        enableSound = savedEnableSound === 'true';
      }
    } catch (error) {
      console.error('Ses ayarı okunurken hata:', error);
    }
    
    if (isStandupNotification) {
      // CASE 3: Uygulama açıkken bildirim gösterme, sadece alarm ekranı gösterilecek
      // triggerAlarm() fonksiyonu zaten ses çalacak, bu yüzden bildirim sesi çalmasın
      if (appState === 'active') {
        return {
          shouldShowAlert: false, // Bildirim gösterme
          shouldPlaySound: false, // Uygulama açıkken bildirim sesi çalmasın (triggerAlarm zaten ses çalacak)
          shouldSetBadge: true,
        };
      }
      // CASE 1 & 2: Uygulama kapalı/kilitli - bildirim göster
      // Bildirim sesi her zaman çalmalı (ayarlardan bağımsız)
      return {
        shouldShowAlert: true, // Bildirim göster
        shouldPlaySound: true, // Bildirim sesi her zaman çal (ayarlardan bağımsız)
        shouldSetBadge: true,
      };
    }
    
    // Diğer bildirimler için normal davranış
    if (appState === 'active') {
      return {
        shouldShowAlert: false,
        shouldPlaySound: enableSound, // Ayarlara göre ses çal
        shouldSetBadge: true,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: enableSound, // Ayarlara göre ses çal
      shouldSetBadge: true,
    };
  },
});


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
  const [firstSittingDuration, setFirstSittingDuration] = useState(null); // İlk oturma süresi (dakika)
  const [totalSittingDuration, setTotalSittingDuration] = useState(null); // Toplam oturma süresi (dakika)
  const [showMenu, setShowMenu] = useState(false); // Hamburger menü gösterimi
  const [showStatistics, setShowStatistics] = useState(false); // İstatistik ekranı gösterimi
  const [showProfile, setShowProfile] = useState(false); // Profil ekranı gösterimi
  const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0); // İstatistikleri yenilemek için key
  const [statisticsView, setStatisticsView] = useState('today'); // İstatistik ekranı sekme seçimi ('today' veya 'all')
  const [enableVibration, setEnableVibration] = useState(true); // Titreşim açık/kapalı
  const [enableSound, setEnableSound] = useState(true); // Ses açık/kapalı
  const [alarmSound, setAlarmSound] = useState('alarm1'); // Alarm sesi seçimi
  const [gender, setGender] = useState(null); // Cinsiyet seçimi ('male' veya 'female')
  const [showGenderSelection, setShowGenderSelection] = useState(false); // Cinsiyet seçim ekranı gösterimi
  
  // Mevcut alarm sesleri listesi (sounds klasöründeki dosyalara göre)
  const availableAlarmSounds = [
    { id: 'alarm1', label: 'Alarm 1', file: require('./assets/sounds/alarm1.wav') },
    { id: 'alarm2', label: 'Alarm 2', file: require('./assets/sounds/alarm2.wav') },
    { id: 'alarm3', label: 'Alarm 3', file: require('./assets/sounds/alarm3.wav') },
  ];
  
  const intervalRef = useRef(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(null); // Zamanlayıcı başladığında zamanı sakla
  const initialDurationRef = useRef(null); // Başlangıç süresini sakla
  const appStateRef = useRef(AppState.currentState);
  const soundRef = useRef(null); // Ses çalma referansı
  const soundTimeoutRef = useRef(null); // Ses kontrol timeout referansı
  const isAlarmStoppedRef = useRef(false); // Alarm durduruldu mu flag'i
  const allSoundRefs = useRef([]); // TÜM ses objelerini takip et (çoklu ses objesi sorunu için)
  const isPlayingAlarmSoundRef = useRef(false); // playAlarmSound şu anda çalışıyor mu? (çift çağrı önleme)
  const alarmSoundRef = useRef('alarm1'); // Alarm sesi ref (closure sorunu için)
  const enableVibrationRef = useRef(true); // Titreşim ref
  const enableSoundRef = useRef(true); // Ses ref
  const isAlarmRef = useRef(false); // Alarm durumu ref (hemen güncellenir, race condition önleme)

  // Ayarları yükle ve notification channel oluştur
  useEffect(() => {
    loadSettings();
    requestPermissions();
    
    // Android için notification channel'ları oluştur (dinamik - availableAlarmSounds'a göre)
    if (Platform.OS === 'android') {
      // Her alarm sesi için channel oluştur
      availableAlarmSounds.forEach(sound => {
        Notifications.setNotificationChannelAsync(sound.id, {
          name: `Kalk Hatırlatıcı - ${sound.label}`,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500, 200, 500], // Standart titreşim pattern'i
          lightColor: '#FF231F7C',
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
          enableVibrate: true,
          enableLights: true,
        });
      });
    }

  }, []);

  // Timer durumunu restore etme fonksiyonu (hem uygulama açılışında hem bildirim tıklandığında kullanılacak)
  const restoreTimerState = async (shouldTriggerAlarmIfExpired = false) => {
    try {
      const savedStartTime = await AsyncStorage.getItem('timerStartTime');
      const savedInitialDuration = await AsyncStorage.getItem('timerInitialDuration');
      const savedIsRunning = await AsyncStorage.getItem('timerIsRunning');
      const savedSnoozeCount = await AsyncStorage.getItem('timerSnoozeCount');
      
      if (savedSnoozeCount) {
        setSnoozeCount(parseInt(savedSnoozeCount));
      }
      
      if (savedIsRunning === 'true' && savedStartTime && savedInitialDuration) {
        const startTime = parseInt(savedStartTime);
        const initialDuration = parseInt(savedInitialDuration);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, initialDuration - elapsed);
        
        if (remaining <= 0) {
          // Süre dolmuş
          console.log('⏰ Timer süresi dolmuş, kalan süre:', remaining);
          
          // Timer durumunu temizle
          await AsyncStorage.removeItem('timerStartTime');
          await AsyncStorage.removeItem('timerInitialDuration');
          await AsyncStorage.removeItem('timerIsRunning');
          await AsyncStorage.removeItem('timerSnoozeCount');
          
          // Eğer shouldTriggerAlarmIfExpired true ise alarm ekranını aç
          if (shouldTriggerAlarmIfExpired) {
            console.log('🚨 Süre dolmuş, alarm tetikleniyor...');
            // BASİT: Direkt triggerAlarm çağır
            setTimeout(async () => {
              if (!isAlarmRef.current) {
                await triggerAlarm();
              }
            }, 300);
          } else {
            // Timer durumunu sıfırla
            setIsRunning(false);
            setTimeLeft(0);
          }
        } else {
          // Timer devam ediyor, kalan süreyi göster
          console.log('⏱️ Timer devam ediyor, kalan süre:', remaining, 'saniye');
          const initialDurationMinutes = initialDuration / 60; // dakika cinsinden
          setIsRunning(true);
          setTimeLeft(remaining);
          setInitialDuration(initialDurationMinutes);
          setDuration(initialDurationMinutes); // Halka için başlangıç süresini set et
          startTimeRef.current = startTime;
          initialDurationRef.current = initialDuration; // BAŞLANGIÇ süresi, kalan süre değil!
        }
      } else {
        console.log('ℹ️ Timer durumu yok veya geçersiz');
        // Timer durumu yoksa alarm tetikleme - sadece bildirim tıklama durumunda tetiklenmeli
        // Ama burada shouldTriggerAlarmIfExpired false olmalı çünkü timer durumu yok
      }
    } catch (error) {
      console.error('❌ Timer durumu restore edilirken hata:', error);
      // Hata olursa bile shouldTriggerAlarmIfExpired true ise alarm tetikle
      if (shouldTriggerAlarmIfExpired) {
        console.log('🚨 Hata sonrası alarm tetikleniyor...');
        setTimeout(async () => {
          if (!isAlarmRef.current) {
            await triggerAlarm();
          }
        }, 500);
      }
    }
  };

  const loadSettings = async () => {
    try {
      const savedSnoozeDuration = await AsyncStorage.getItem('snoozeDuration');
      const savedMaxSnoozes = await AsyncStorage.getItem('maxSnoozes');
      const savedEnableVibration = await AsyncStorage.getItem('enableVibration');
      const savedEnableSound = await AsyncStorage.getItem('enableSound');
      const savedAlarmSound = await AsyncStorage.getItem('alarmSound');
      const savedGender = await AsyncStorage.getItem('gender');
      
      setDuration(0); // Her zaman 0'dan başla
      if (savedSnoozeDuration) setSnoozeDuration(parseInt(savedSnoozeDuration));
      if (savedMaxSnoozes) setMaxSnoozes(parseInt(savedMaxSnoozes));
      if (savedEnableVibration !== null) {
        const vibValue = savedEnableVibration === 'true';
        setEnableVibration(vibValue);
        enableVibrationRef.current = vibValue;
      }
      if (savedEnableSound !== null) {
        const soundValue = savedEnableSound === 'true';
        setEnableSound(soundValue);
        enableSoundRef.current = soundValue;
      }
      if (savedAlarmSound) {
        // Kayıtlı alarm sesi availableAlarmSounds içinde var mı kontrol et
        const isValidSound = availableAlarmSounds.some(s => s.id === savedAlarmSound);
        if (isValidSound) {
          setAlarmSound(savedAlarmSound);
          alarmSoundRef.current = savedAlarmSound;
        } else {
          // Geçersiz ses ID'si, default olarak ilk sesi kullan
          setAlarmSound(availableAlarmSounds[0].id);
          alarmSoundRef.current = availableAlarmSounds[0].id;
        }
      } else {
        // Hiç kayıt yoksa default olarak ilk sesi kullan
        setAlarmSound(availableAlarmSounds[0].id);
        alarmSoundRef.current = availableAlarmSounds[0].id;
      }
      
      // Cinsiyet yükle
      if (savedGender === 'male' || savedGender === 'female') {
        setGender(savedGender);
        setShowGenderSelection(false);
      } else {
        // Cinsiyet seçilmemişse seçim ekranını göster
        setShowGenderSelection(true);
      }
      
      // Timer durumunu restore et (uygulama açılışında alarm tetikleme)
      await restoreTimerState(false);
      
      // İlk oturma süresini ve toplam oturma süresini yükle (timer çalışsa da çalışmasa da)
      const savedFirstSittingDuration = await AsyncStorage.getItem('firstSittingDuration');
      const savedTotalSittingDuration = await AsyncStorage.getItem('totalSittingDuration');
      if (savedFirstSittingDuration) {
        setFirstSittingDuration(parseFloat(savedFirstSittingDuration));
      }
      if (savedTotalSittingDuration) {
        setTotalSittingDuration(parseFloat(savedTotalSittingDuration));
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
      setDuration(0);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('duration', duration.toString());
      await AsyncStorage.setItem('snoozeDuration', snoozeDuration.toString());
      await AsyncStorage.setItem('maxSnoozes', maxSnoozes.toString());
      await AsyncStorage.setItem('enableVibration', enableVibration.toString());
      await AsyncStorage.setItem('enableSound', enableSound.toString());
      await AsyncStorage.setItem('alarmSound', alarmSound);
    } catch (error) {
      console.error('Ayarlar kaydedilemedi:', error);
    }
  };

  // Günlük istatistikleri kaydet
  const saveDailyStatistics = async (sessionData) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
      const statsKey = `dailyStats_${today}`;
      
      // Mevcut istatistikleri yükle
      const existingStats = await AsyncStorage.getItem(statsKey);
      let stats = existingStats ? JSON.parse(existingStats) : {
        totalSittingTime: 0,
        alarmCount: 0,
        snoozeCount: 0,
        sessions: [],
      };
      
      // Yeni session verilerini ekle
      stats.totalSittingTime += sessionData.totalDuration || 0;
      stats.alarmCount += 1;
      stats.snoozeCount += sessionData.snoozeCount || 0;
      stats.sessions.push({
        duration: sessionData.totalDuration || 0,
        snoozes: sessionData.snoozeCount || 0,
        timestamp: Date.now(),
      });
      
      // Kaydet
      await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
      
    } catch (error) {
      console.error('İstatistikler kaydedilemedi:', error);
    }
  };


  // Tüm verileri temizle (test için)
  const clearAllData = async () => {
    showAlert(
      'Verileri Temizle',
      'Tüm istatistik verileri ve timer durumları silinecek. Bu işlem geri alınamaz. Emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // Tüm günlük istatistikleri temizle
              const keys = await AsyncStorage.getAllKeys();
              const statsKeys = keys.filter(key => key.startsWith('dailyStats_'));
              await AsyncStorage.multiRemove(statsKeys);
              
              // Timer durumlarını temizle
              await AsyncStorage.multiRemove([
                'timerStartTime',
                'timerInitialDuration',
                'timerIsRunning',
                'timerSnoozeCount',
                'firstSittingDuration',
                'totalSittingDuration',
              ]);
              
              // State'leri sıfırla
              setSnoozeCount(0);
              setFirstSittingDuration(null);
              setTotalSittingDuration(null);
              setDuration(0);
              setIsRunning(false);
              setTimeLeft(null);
              setInitialDuration(null);
              
              // Scheduled notification'ları iptal et
              await Notifications.cancelAllScheduledNotificationsAsync();
              
              showAlert('Başarılı', 'Tüm veriler temizlendi.', [
                {
                  text: 'Tamam',
                  onPress: () => {},
                },
              ]);
            } catch (error) {
              console.error('Veriler temizlenirken hata:', error);
              showAlert('Hata', 'Veriler temizlenirken bir hata oluştu.', [
                {
                  text: 'Tamam',
                  onPress: () => {},
                },
              ]);
            }
          },
        },
      ]
    );
  };

  // Bildirim izinlerini ayarlar ekranından yönetmek için yardımcı fonksiyonlar
  const checkNotificationPermissions = async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      setNotificationStatus(settings?.status || null);
      showAlert(
        'Bildirim izni',
        `Şu anki bildirim izni durumu: ${settings?.status || 'bilinmiyor'}.`,
        [
          {
            text: 'Tamam',
            onPress: () => {},
          },
        ]
      );
    } catch (e) {
      console.error('Bildirim izni durumu alınamadı:', e);
      showAlert(
        'Bildirim izni',
        'Bildirim izni durumu alınamadı. Lütfen daha sonra tekrar dene.',
        [
          {
            text: 'Tamam',
            onPress: () => {},
          },
        ]
      );
    }
  };

  const requestNotificationPermissionsAgain = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationStatus(status);
      if (status === 'granted') {
        showAlert(
          'Bildirim izni',
          'Bildirim izni verildi. Arka planda kalkma uyarıları gönderilebilecek. ✅',
          [
            {
              text: 'Tamam',
              onPress: () => {},
            },
          ]
        );
      } else {
        showAlert(
          'Bildirim izni',
          'Bildirim izni verilemedi. İstersen cihaz ayarlarından daha sonra açabilirsin.',
          [
            {
              text: 'Tamam',
              onPress: () => {},
            },
          ]
        );
      }
    } catch (e) {
      console.error('Bildirim izni yeniden istenirken hata:', e);
      showAlert(
        'Bildirim izni',
        'Bildirim izni istenirken bir hata oluştu. Lütfen daha sonra tekrar dene.',
        [
          {
            text: 'Tamam',
            onPress: () => {},
          },
        ]
      );
    }
  };

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error('Sistem ayarları açılamadı:', e);
      showAlert(
        'Sistem ayarları',
        'Sistem ayarları açılamadı. Lütfen cihaz ayarlarından uygulamayı elle aç ve izinleri güncelle.',
        [
          {
            text: 'Tamam',
            onPress: () => {},
          },
        ]
      );
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });
      setNotificationStatus(status);
      if (status !== 'granted') {
        if (Platform.OS === 'ios') {
          showAlert(
            'Bildirim izni gerekli',
            'Arka planda kalkma uyarısı gönderebilmemiz için bildirim iznine ihtiyacımız var. Lütfen izin ver.',
            [
              {
                text: 'Tamam',
                onPress: () => {},
              },
            ]
          );
        } else {
          // Android'de hata gibi algılanmasın diye sadece logluyoruz
          console.warn('Bildirim izni verilmedi. Arka planda uyarılar çalışmayabilir.');
        }
      } else {
        console.log('Bildirim izni verildi:', status);
      }
    } catch (error) {
      console.error('Bildirim izni istenirken hata:', error);
    }
  };

  // AppState değişikliklerini dinle (arka plan/ön plan)
  // OPTİMİZE: Timer interval'ini de yönetiyor (battery optimization)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      if (prevAppState.match(/inactive|background/) && nextAppState === 'active') {
        // Uygulama ön plana geldiğinde (background'dan veya kapalı durumdan)
        console.log('📱 Uygulama ön plana geldi (background/inactive -> active)');
        
        // Timer durumunu restore et (AMA alarm tetikleme - sadece timer devam etsin)
        // shouldTriggerAlarmIfExpired: false - çünkü bu normal arka plan/ön plan geçişi
        // restoreTimerState zaten kalan süreyi hesaplayıp setTimeLeft yapıyor, ekstra hesaplama gerekmez
        await restoreTimerState(false);
        
        // Timer çalışıyorsa ve interval yoksa yeniden başlat (arka planda durdurulmuş olabilir)
        if (isRunning && startTimeRef.current && initialDurationRef.current && !intervalRef.current && !isAlarm) {
          const updateTimer = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000);
            const remaining = Math.max(0, initialDurationRef.current - elapsed);
            
            if (remaining <= 0) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              triggerAlarm();
              setTimeLeft(0);
            } else {
              setTimeLeft((prev) => (prev === remaining ? prev : remaining));
            }
          };
          updateTimer(); // Hemen güncelle
          intervalRef.current = setInterval(updateTimer, 1000);
        }
      } else if (prevAppState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // Arka plana geçtiğinde interval'i durdur (battery optimization)
        // Timer state AsyncStorage'da zaten kayıtlı, notification zaten planlanmış
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning, isAlarm]); // isRunning ve isAlarm dependency'leri eklendi - timer durumu değiştiğinde listener'ı güncelle

  // Uygulama açıkken görsel geri sayım için zamanlayıcı
  // OPTİMİZE EDİLMİŞ: Date.now() tabanlı gerçek zaman hesaplama, sistem kaynaklarından az etkilenir
  useEffect(() => {
    // Eğer alarm açıksa interval başlatma
    if (isAlarm) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    if (isRunning && startTimeRef.current && initialDurationRef.current) {
      // OPTİMİZE: timeLeft dependency'sini kaldırdık, sadece isRunning ve isAlarm kontrol ediliyor
      // Bu sayede her saniye re-render olmuyor, sadece gerçek zaman hesaplaması yapılıyor
      
      // İlk güncellemeyi hemen yap (gecikme olmadan)
      const updateTimer = () => {
        // Gerçek zamanı hesapla (Date.now() tabanlı - sistem saatinden bağımsız, çok hassas)
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const remaining = Math.max(0, initialDurationRef.current - elapsed);
        
        if (remaining <= 0) {
          // Süre doldu, alarm tetikle
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Alarm zaten açıksa tekrar tetikleme
          if (!isAlarmRef.current) {
            triggerAlarm();
          }
          setTimeLeft(0);
        } else {
          // Sadece saniye değiştiyse state'i güncelle (gereksiz re-render'ları önle)
          setTimeLeft((prev) => {
            // Eğer aynı saniyeyse güncelleme yapma (performans optimizasyonu)
            if (prev === remaining) {
              return prev;
            }
            return remaining;
          });
        }
      };
      
      // İlk güncellemeyi hemen yap
      updateTimer();
      
      // Platform-specific interval optimizasyonu
      // iOS ve Android için optimize edilmiş interval
      // requestAnimationFrame kullanmak yerine setInterval kullanıyoruz çünkü:
      // 1. requestAnimationFrame ekran yenileme hızına bağlı (60fps = 16ms), timer için uygun değil
      // 2. setInterval ile 1000ms interval daha doğru ve tahmin edilebilir
      // 3. Date.now() tabanlı hesaplama sayesinde interval gecikmeleri telafi ediliyor
      
      // Interval'i başlat (1000ms = 1 saniye)
      // NOT: setInterval her zaman tam 1000ms olmayabilir (JavaScript event loop gecikmeleri)
      // Ama Date.now() tabanlı hesaplama sayesinde bu gecikmeler telafi ediliyor
      intervalRef.current = setInterval(updateTimer, 1000);
      
      // Arka plan optimizasyonu: Mevcut AppState listener zaten interval'i yönetiyor
      // Bu yüzden burada ayrı bir listener eklemiyoruz
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Timer çalışmıyorsa interval'i temizle
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning, isAlarm]); // timeLeft dependency'sini kaldırdık - performans optimizasyonu

  // Scheduled notification'ları dinle (arka planda veya ön planda)
  useEffect(() => {
    // CASE 3: Uygulama açıkken notification geldiğinde alarm ekranını aç
    const receivedSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification alındı:', notification.request.content.data?.type);
      if (notification.request.content.data?.type === 'standup') {
        const currentAppState = AppState.currentState;
        
        // CASE 3: Uygulama açıkken - bildirim gösterme, sadece alarm ekranı
        if (currentAppState === 'active') {
          console.log('CASE 3: Uygulama açık, alarm ekranı gösteriliyor (bildirim yok)');
          
          // Bildirimi kapat (uygulama açıkken gösterilmeyecek)
          const notificationId = notification.request.identifier;
          try {
            await Notifications.dismissNotificationAsync(notificationId);
          } catch (error) {
            console.error('Bildirim kapatılırken hata:', error);
          }
          
          // triggerAlarm fonksiyonunu çağır (ses ve titreşim için)
          if (!isAlarmRef.current) {
            triggerAlarm();
          }
        }
        // CASE 1 & 2: Uygulama kapalı/kilitli - bildirim gösterilecek, butonlarla çalışacak
        // Notification handler'da shouldShowAlert: true ile bildirim gösterilecek
      }
    });

    // CASE 1 & 2: Uygulama kapalıyken notification'a tıklandığında
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('📱 Notification\'a tıklandı:', response.notification.request.content.data?.type);
      const notificationData = response.notification.request.content.data;
      
      if (notificationData?.type === 'standup') {
        // Bildirimi kapat
        const notificationId = response.notification.request.identifier;
        try {
          await Notifications.dismissNotificationAsync(notificationId);
        } catch (error) {
          console.error('Bildirim kapatılırken hata:', error);
        }
        
        // BASİT ÇÖZÜM: Bildirim tıklandığında direkt alarm tetikle
        // Timer zaten dolmuş, sadece alarm ekranını aç
        console.log('📱 Bildirim tıklandı, alarm tetikleniyor...');
        
        // ÖNEMLİ: Bildirim sesini durdur (bildirim tıklandığında sistem sesi çalıyor olabilir)
        // Tüm aktif bildirimleri dismiss et
        try {
          await Notifications.dismissAllNotificationsAsync();
        } catch (e) {
          // Hata olsa bile devam et
        }
        
        // Kısa bir gecikme ile triggerAlarm çağır (uygulama açılmasını bekle)
        setTimeout(async () => {
          if (!isAlarmRef.current) {
            await triggerAlarm();
          }
        }, 300);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [snoozeDuration]); // snoozeDuration dependency olarak eklendi

  const triggerAlarm = async () => {
    // BASİT: Alarm zaten açıksa tekrar tetikleme
    if (isAlarmRef.current) {
      console.log('⚠️ Alarm zaten açık, tekrar tetiklenmiyor');
      return;
    }
    
    console.log('🚨 triggerAlarm çağrıldı');
    
    // Önce interval'ı durdur (timer durmalı)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Interval durduruldu (triggerAlarm)');
    }
    
    // Özet bilgileri yükle
    let savedSnoozeCount = 0;
    let savedFirstSittingDuration = null;
    let savedTotalSittingDuration = null;
    try {
      const savedSnooze = await AsyncStorage.getItem('timerSnoozeCount');
      const savedFirst = await AsyncStorage.getItem('firstSittingDuration');
      const savedTotal = await AsyncStorage.getItem('totalSittingDuration');
      if (savedSnooze) {
        savedSnoozeCount = parseInt(savedSnooze);
      }
      if (savedFirst) {
        savedFirstSittingDuration = parseFloat(savedFirst);
      }
      if (savedTotal) {
        savedTotalSittingDuration = parseFloat(savedTotal);
      }
    } catch (error) {
      console.error('Özet bilgiler yüklenirken hata:', error);
    }
    
    setIsRunning(false);
    setIsAlarm(true);
    isAlarmRef.current = true; // Ref'i hemen güncelle
    setTimeLeft(0);
    setSnoozeCount(savedSnoozeCount);
    setFirstSittingDuration(savedFirstSittingDuration);
    setTotalSittingDuration(savedTotalSittingDuration);
    startTimeRef.current = null;
    initialDurationRef.current = null;

    // Ayarları AsyncStorage'dan direkt oku (her zaman güncel garantisi)
    let currentEnableVibration = true;
    let currentEnableSound = true;
    let currentAlarmSound = 'alarm1';
    
    try {
      const savedAlarmSound = await AsyncStorage.getItem('alarmSound');
      if (savedAlarmSound) {
        currentAlarmSound = savedAlarmSound;
        alarmSoundRef.current = savedAlarmSound; // Ref'i de güncelle
      } else {
        currentAlarmSound = alarmSoundRef.current || 'alarm1';
      }
      
      const savedEnableVibration = await AsyncStorage.getItem('enableVibration');
      if (savedEnableVibration !== null) {
        currentEnableVibration = savedEnableVibration === 'true';
        enableVibrationRef.current = currentEnableVibration;
      } else {
        currentEnableVibration = enableVibrationRef.current;
      }
      
      const savedEnableSound = await AsyncStorage.getItem('enableSound');
      if (savedEnableSound !== null) {
        currentEnableSound = savedEnableSound === 'true';
        enableSoundRef.current = currentEnableSound;
      } else {
        currentEnableSound = enableSoundRef.current;
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
      // Hata olursa ref'lerden oku
      currentEnableVibration = enableVibrationRef.current;
      currentEnableSound = enableSoundRef.current;
      currentAlarmSound = alarmSoundRef.current || 'alarm1';
    }
    
    console.log('📋 triggerAlarm - Ayarlar (AsyncStorage):', {
      enableVibration: currentEnableVibration,
      enableSound: currentEnableSound,
      alarmSound: currentAlarmSound,
    });

    // Titreşim - ayarlara göre
    console.log('📳 triggerAlarm - Titreşim kontrolü - enableVibration:', currentEnableVibration);
    if (currentEnableVibration) {
      console.log('✅ Titreşim açık, titreşim başlatılıyor...');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Standart titreşim pattern'i (her ses için aynı)
        const vibrationPattern = [0, 500, 200, 500, 200, 500];
        Vibration.vibrate(vibrationPattern, true); // true = tekrarla
      }
    } else {
      console.log('🔇 Titreşim kapalı, titreşim çalınmayacak');
    }
    
    // Ses çal - ayarlara göre
    console.log('🔊 triggerAlarm - Ses kontrolü - enableSound:', currentEnableSound);
    if (currentEnableSound) {
      console.log('✅ Ses açık, playAlarmSound çağrılıyor...');
      // playAlarmSound'e alarmSound'i parametre olarak geç
      await playAlarmSound(currentAlarmSound, currentEnableSound);
    } else {
      console.log('🔇 Ses kapalı, ses çalınmayacak');
    }
    
    // Scheduled notification zaten planlanmış, arka planda kendisi tetiklenecek
    // Uygulama açıkken bu fonksiyon çağrıldığında sadece alarm ekranını gösteriyoruz
  };

  // Alarm sesi çalma fonksiyonu (test için)
  const playTestSound = async (soundType = null) => {
    try {
      // Ses kapalıysa çalma
      if (!enableSound) {
        console.log('🔇 Ses kapalı, test sesi çalınmayacak');
        return;
      }

      // Parametre verilmediyse state'den al
      const currentSoundType = soundType !== null ? soundType : alarmSound;
      
      // availableAlarmSounds listesinden ses dosyasını bul
      const selectedSound = availableAlarmSounds.find(s => s.id === currentSoundType) || availableAlarmSounds[0];
      const alarmName = selectedSound.label;
      console.log('🔊 Test sesi çalınıyor:', alarmName, 'ID:', currentSoundType, 'Parametre:', soundType);
      
      // Önceki sesi durdur
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Ses modunu ayarla
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      // Ses dosyasını yükle ve çal
      try {
        const soundUri = selectedSound.file;

        const { sound } = await Audio.Sound.createAsync(
          soundUri,
          { 
            shouldPlay: true,
            isLooping: false, // Test için tek seferlik çal
            volume: 1.0,
          }
        );
        
        soundRef.current = sound;
        console.log('✅ Alarm sesi yüklendi ve çalınıyor:', alarmName);
        
        // 3 saniye sonra otomatik durdur
        setTimeout(async () => {
          if (soundRef.current === sound) {
            try {
              await sound.stopAsync();
              await sound.unloadAsync();
              soundRef.current = null;
              console.log('⏹️ Test sesi 3 saniye sonra durduruldu');
            } catch (error) {
              console.error('Ses durdurulurken hata:', error);
            }
          }
        }, 3000); // 3 saniye
        
        // Ses bittiğinde temizle
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
      } catch (soundError) {
        console.error('❌ Ses dosyası yüklenirken hata:', soundError);
        console.log('⚠️ Bildirim sesi kullanılıyor');
        // Ses dosyası yoksa bildirim sesi kullan
        const selectedSound = availableAlarmSounds.find(s => s.id === soundType) || availableAlarmSounds[0];
        const channelId = selectedSound.id;
        const alarmName = selectedSound.label;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔊 Test Sesi',
            body: `${alarmName} test ediliyor`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId: channelId,
          },
          trigger: {
            type: 'timeInterval',
            seconds: 1,
          },
        });
      }
      
      // iOS için haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Test sesi çalınırken hata:', error);
    }
  };

  // Alarm sesi çalma fonksiyonu - BASİT VERSİYON
  const playAlarmSound = async (soundType = null, soundEnabled = null) => {
    // ÇİFT ÇAĞRI ÖNLEME: Eğer zaten çalışıyorsa bekle
    if (isPlayingAlarmSoundRef.current) {
      console.log('⚠️ playAlarmSound zaten çalışıyor, bekleniyor...');
      // Önceki çağrının bitmesini bekle
      while (isPlayingAlarmSoundRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }
    
    isPlayingAlarmSoundRef.current = true;
    
    try {
      // Parametreler verilmediyse state'den al
      const currentAlarmSound = soundType !== null ? soundType : alarmSound;
      const currentEnableSound = soundEnabled !== null ? soundEnabled : enableSound;
      
      // Ses kapalıysa çalma
      if (!currentEnableSound) {
        isPlayingAlarmSoundRef.current = false;
        return;
      }
      
      // ÖNEMLİ: ÖNCE TÜM SES OBJELERİNİ DURDUR (çoklu ses objesi sorunu için)
      console.log('🔇 Önceki tüm sesler durduruluyor...');
      
      // soundRef.current'ı durdur
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
      }
      
      // allSoundRefs'teki TÜM ses objelerini durdur
      for (const sound of allSoundRefs.current) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await sound.stopAsync();
            await sound.unloadAsync();
          }
        } catch (e) {
          // Hata olsa bile devam et
        }
      }
      allSoundRefs.current = []; // Listeyi temizle

      // Ses modunu ayarla
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });

      // Ses dosyasını bul
      const selectedSound = availableAlarmSounds.find(s => s.id === currentAlarmSound) || availableAlarmSounds[0];
      const soundUri = selectedSound.file;
      console.log('🔊 Ses çalınıyor:', selectedSound.label, 'ID:', currentAlarmSound);
      
      // Alarm durduruldu flag'ini sıfırla
      isAlarmStoppedRef.current = false;
      
      // Ses çal - BASİT: Sadece createAsync, isLooping: true
      const { sound } = await Audio.Sound.createAsync(
        soundUri,
        { 
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      
      soundRef.current = sound;
      allSoundRefs.current.push(sound); // Tüm ses objelerini takip et
      console.log('✅ Ses objesi kaydedildi, toplam ses sayısı:', allSoundRefs.current.length);
      
    } catch (soundError) {
      console.error('❌ Ses çalma hatası:', soundError);
    } finally {
      isPlayingAlarmSoundRef.current = false;
    }
  };

  // Alarm sesini durdurma fonksiyonu - BASİT: TÜM ses objelerini bul, durdur, kill et
  const stopAlarmSound = async () => {
    console.log('🔇 stopAlarmSound çağrıldı');
    
    // Flag set et
    isAlarmStoppedRef.current = true;
    
    // Timeout iptal et
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    
    // ÖNEMLİ: Bildirim sesini de durdur (bildirimden gelince sistem sesi çalıyor olabilir)
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ Bildirimler dismiss edildi');
    } catch (e) {
      console.log('⚠️ Bildirim dismiss hatası:', e);
    }
    
    // ÖNEMLİ: TÜM SES OBJELERİNİ DURDUR (çoklu ses objesi sorunu için)
    console.log('🔍 Tüm ses objeleri durduruluyor, toplam:', allSoundRefs.current.length + (soundRef.current ? 1 : 0));
    
    // soundRef.current'ı durdur
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.stopAsync();
        }
        await soundRef.current.unloadAsync();
        console.log('✅ soundRef.current durduruldu');
      } catch (e) {
        console.error('❌ soundRef.current durdurma hatası:', e);
      }
      soundRef.current = null;
    }
    
    // allSoundRefs'teki TÜM ses objelerini durdur
    for (const sound of allSoundRefs.current) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.stopAsync();
          await sound.unloadAsync();
          console.log('✅ Ek ses objesi durduruldu');
        }
      } catch (e) {
        console.error('❌ Ek ses objesi durdurma hatası:', e);
      }
    }
    allSoundRefs.current = []; // Listeyi temizle
    
    // Audio modunu sıfırla
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });
      console.log('✅ Audio modu sıfırlandı');
    } catch (e) {
      console.log('⚠️ Audio modu sıfırlama hatası:', e);
    }
  };

  // Notification içeriği oluşturma helper fonksiyonu
  const createStandupNotificationContent = () => {
    // Ses seçimine göre channel ID belirle - alarmSound ID'si direkt channel ID olarak kullanılır
    const channelId = alarmSound;
    
    const baseContent = {
      title: 'Kalkma Zamanı! 🚶',
      body: 'Uzun süredir oturuyorsunuz, kalkıp biraz yürüyün!',
      sound: enableSound, // Ayarlardan gelen ses ayarı
      priority: Notifications.AndroidNotificationPriority.MAX,
      channelId: channelId, // Seçilen ses tipine göre channel
      // categoryIdentifier kaldırıldı - butonlar yok
      data: { 
        type: 'standup',
        action: 'open_alarm',
        timestamp: Date.now(),
      },
    };

    // iOS için badge ekle
    if (Platform.OS === 'ios') {
      return {
        ...baseContent,
        badge: 1,
      };
    }

    // Android için
    return baseContent;
  };

  const startTimer = async () => {
    if (duration > 0) {
      const seconds = Math.floor(duration * 60);
      const startTime = Date.now();
      
      setTimeLeft(seconds);
      setIsRunning(true);
      setIsAlarm(false);
      isAlarmRef.current = false;
      setSnoozeCount(0);
      setInitialDuration(duration); // Başlangıç süresini kaydet (dakika cinsinden)
      startTimeRef.current = startTime; // Başlangıç zamanını kaydet
      initialDurationRef.current = seconds; // Başlangıç süresini kaydet (saniye cinsinden)
      
      // İlk oturma süresini ve toplam oturma süresini kaydet
      setFirstSittingDuration(duration);
      setTotalSittingDuration(duration);
      
      // Timer durumunu AsyncStorage'a kaydet (uygulama kapalıyken devam etmesi için)
      try {
        await AsyncStorage.setItem('timerStartTime', startTime.toString());
        await AsyncStorage.setItem('timerInitialDuration', seconds.toString());
        await AsyncStorage.setItem('timerIsRunning', 'true');
        await AsyncStorage.setItem('timerSnoozeCount', '0');
        await AsyncStorage.setItem('firstSittingDuration', duration.toString());
        await AsyncStorage.setItem('totalSittingDuration', duration.toString());
      } catch (error) {
        console.error('Timer durumu kaydedilemedi:', error);
      }
      
      // saveSettings() kaldırıldı - sadece "Kaydet" butonuna basıldığında kaydedilecek

      // Bildirim gönder (hem Android hem iOS için)
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Saniye değerinin geçerli olduğundan emin ol
      if (seconds > 0 && !isNaN(seconds)) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: createStandupNotificationContent(),
            trigger: {
              type: 'timeInterval',
              seconds: Math.max(1, Math.floor(seconds)),
            },
          });
          console.log(`Alarm planlandı: ${seconds} saniye sonra (${Platform.OS})`);
        } catch (error) {
          console.error('Alarm planlanırken hata:', error);
        }
      } else {
        console.warn('Geçersiz süre değeri, alarm planlanamadı:', seconds);
      }
    }
  };

  const stopTimer = async () => {
    setIsRunning(false);
    setTimeLeft(null);
    setIsAlarm(false);
    isAlarmRef.current = false;
    setSnoozeCount(0);
    setInitialDuration(null); // Başlangıç süresini sıfırla
    setFirstSittingDuration(null);
    setTotalSittingDuration(null);
    startTimeRef.current = null;
    initialDurationRef.current = null;
    
    // Timer durumunu AsyncStorage'dan sil
    try {
      await AsyncStorage.removeItem('timerStartTime');
      await AsyncStorage.removeItem('timerInitialDuration');
      await AsyncStorage.removeItem('timerIsRunning');
      await AsyncStorage.removeItem('timerSnoozeCount');
      await AsyncStorage.removeItem('firstSittingDuration');
      await AsyncStorage.removeItem('totalSittingDuration');
    } catch (error) {
      console.error('Timer durumu silinemedi:', error);
    }
    
    // Scheduled notification'ları iptal et
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
  };

  const handleStandUp = () => {
    console.log('✅ App.js handleStandUp çağrıldı - Kalktım butonuna basıldı');
    
    // HEMEN: Alarm durumunu kapat (UI hemen güncellensin)
    isAlarmRef.current = false;
    setIsAlarm(false);
    setIsRunning(false);
    
    // HEMEN: Titreşimi durdur
    if (Platform.OS === 'android') {
      Vibration.cancel();
    }
    
    // HEMEN: Ses durdurma (non-blocking)
    stopAlarmSound().catch(err => console.error('Ses durdurma hatası:', err));
    
    // ARKA PLANDA: İstatistikleri kaydet (UI'ı bloklamadan)
    if (totalSittingDuration !== null && totalSittingDuration > 0) {
      saveDailyStatistics({
        totalDuration: totalSittingDuration,
        snoozeCount: snoozeCount || 0,
      }).then(() => {
        console.log('📊 İstatistikler kaydedildi');
        // İstatistikler kaydedildikten sonra refresh key'i artır (ekran açıksa yenilenecek)
        setStatisticsRefreshKey(prev => prev + 1);
      }).catch(err => {
        console.error('İstatistik kaydetme hatası:', err);
      });
    }
    
    // ARKA PLANDA: Timer durdur (UI'ı bloklamadan)
    stopTimer().then(() => {
      console.log('⏹️ Timer durduruldu');
    }).catch(err => {
      console.error('Timer durdurma hatası:', err);
    });
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    console.log('✅ handleStandUp tamamlandı');
  };

  const handleSnooze = () => {
    if (snoozeCount < maxSnoozes) {
      // HEMEN: Titreşimi durdur
      if (Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      const newSnoozeCount = snoozeCount + 1;
      const seconds = Math.floor(snoozeDuration * 60);
      const startTime = Date.now();
      
      // Toplam oturma süresine erteleme süresini ekle
      const newTotalSittingDuration = (totalSittingDuration || 0) + snoozeDuration;
      
      setSnoozeCount(newSnoozeCount);
      setTimeLeft(seconds);
      setIsRunning(true);
      setIsAlarm(false);
      isAlarmRef.current = false; // Ref'i de güncelle
      setInitialDuration(snoozeDuration); // Erteleme süresini initialDuration olarak ayarla
      setTotalSittingDuration(newTotalSittingDuration);
      startTimeRef.current = startTime; // Yeni başlangıç zamanı
      initialDurationRef.current = seconds; // Yeni başlangıç süresi (saniye cinsinden)
      
      // ARKA PLANDA: Ses durdurma (non-blocking)
      stopAlarmSound().catch(err => console.error('Ses durdurma hatası:', err));
      
      // ARKA PLANDA: Timer durumunu AsyncStorage'a kaydet (UI'ı bloklamadan)
      (async () => {
        try {
          await AsyncStorage.setItem('timerStartTime', startTime.toString());
          await AsyncStorage.setItem('timerInitialDuration', seconds.toString());
          await AsyncStorage.setItem('timerIsRunning', 'true');
          await AsyncStorage.setItem('timerSnoozeCount', newSnoozeCount.toString());
          if (firstSittingDuration !== null) {
            await AsyncStorage.setItem('firstSittingDuration', firstSittingDuration.toString());
          }
          await AsyncStorage.setItem('totalSittingDuration', newTotalSittingDuration.toString());
        } catch (error) {
          console.error('Timer durumu kaydedilemedi:', error);
        }
      })();
      
      // ARKA PLANDA: Yeni erteleme için notification planla (UI'ı bloklamadan)
      (async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        // Saniye değerinin geçerli olduğundan emin ol
        if (seconds > 0 && !isNaN(seconds)) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: createStandupNotificationContent(),
              trigger: {
                type: 'timeInterval',
                seconds: Math.max(1, Math.floor(seconds)),
              },
            });
            console.log(`Erteleme bildirimi planlandı: ${seconds} saniye sonra (${Platform.OS})`);
          } catch (error) {
            console.error('Erteleme bildirimi planlanırken hata:', error);
          }
        } else {
          console.warn('Geçersiz erteleme süresi, bildirim planlanamadı:', seconds);
        }
      })();
    }
    // Erteleme hakkı bittiyse artık sadece "Kalktım" butonu gösterilecek,
    // ekstra uyarı göstermeye gerek yok.
  };

  // +/- butonları için handler'lar (test için 10 saniye)
  const handleIncrease = () => {
    if (!isRunning && !isAlarm) {
      // Saniye cinsinden hesapla, sonra dakikaya çevir (yuvarlama hatası önlemek için)
      // duration'ı saniyeye çevirirken tam sayıya yuvarla (1dk 10sn = 70 saniye)
      const currentSeconds = Math.round((duration || 0) * 60); // Tam saniye değerini al
      const newSeconds = Math.min(180 * 60, currentSeconds + 10); // 10 saniye ekle, max 180 dakika
      const newDuration = newSeconds / 60; // Tekrar dakikaya çevir (1.1666... gibi ondalıklı olabilir)
      // Hassas yuvarlama: saniye cinsinden tam sayı olarak tut, dakikaya çevirirken hassas yuvarla
      setDuration(Math.round(newDuration * 10000) / 10000); // 4 ondalık hassasiyetle yuvarla
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(10);
      }
    }
  };

  const handleDecrease = () => {
    if (!isRunning && !isAlarm) {
      // Saniye cinsinden hesapla, sonra dakikaya çevir (yuvarlama hatası önlemek için)
      // duration'ı saniyeye çevirirken tam sayıya yuvarla (1dk 10sn = 70 saniye)
      const currentSeconds = Math.round((duration || 0) * 60); // Tam saniye değerini al
      const newSeconds = Math.max(0, currentSeconds - 10); // 10 saniye çıkar, minimum 0
      const newDuration = newSeconds / 60; // Tekrar dakikaya çevir (1.1666... gibi ondalıklı olabilir)
      // Hassas yuvarlama: saniye cinsinden tam sayı olarak tut, dakikaya çevirirken hassas yuvarla
      // Eğer 0 veya daha azsa, null yap ki "Kalkış zamanını ayarla" göstersin
      setDuration(newSeconds <= 0 ? null : Math.round(newDuration * 10000) / 10000); // 4 ondalık hassasiyetle yuvarla
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Vibration.vibrate(10);
      }
    }
  };

  // Forest app tarzı halkayı çevirme için handler
  const handleDialRotate = (angle) => {
    if (!isRunning && !isAlarm) {
      // Açıyı dakikaya çevir (360 derece = 120 dakika)
      const newDuration = Math.min(120, Math.max(0, (angle / 360) * 120));
      // Hareket sırasında smooth, release'de snap-to-grid (10dk)
      setDuration(newDuration <= 0 ? null : newDuration);
      // Haptic feedback (sadece 10dk adımlarında)
      if (newDuration > 0 && newDuration % 10 === 0) {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Vibration.vibrate(10);
        }
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
  const displayTime = (timeLeft !== null && timeLeft !== undefined && !isNaN(timeLeft))
    ? timeLeft / 60  // Saniyeyi dakikaya çevir (0.5, 1.5 gibi ondalıklı olabilir)
    : ((duration !== null && duration !== undefined && !isNaN(duration)) ? duration : 0);

  // Cinsiyet seçim handler'ı
  const handleGenderSelect = async (selectedGender) => {
    try {
      await AsyncStorage.setItem('gender', selectedGender);
      setGender(selectedGender);
      setShowGenderSelection(false);
    } catch (error) {
      console.error('Cinsiyet kaydedilemedi:', error);
    }
  };

  // Hangi ekranın gösterileceğini hesapla
  // Cinsiyet seçimi en yüksek öncelik - ilk açılışta gösterilmeli
  // Alarm ekranı ikinci öncelik - her zaman en üstte görünmeli
  let content;

  if (showGenderSelection) {
    // Cinsiyet seçim ekranı - en yüksek öncelik
    content = (
      <GenderSelection onSelect={handleGenderSelect} />
    );
  } else if (isAlarm) {
    // Alarm ekranı - en yüksek öncelik
    content = (
      <AlarmScreen
        totalSittingDuration={totalSittingDuration}
        snoozeCount={snoozeCount}
        maxSnoozes={maxSnoozes}
        snoozeDuration={snoozeDuration}
        onSnooze={handleSnooze}
        onStandUp={handleStandUp}
        stopAlarmSound={stopAlarmSound}
        intervalRef={intervalRef}
      />
    );
  } else if (showSettings) {
    // Ayarlar ekranı
    content = (
      <SettingsScreen
        snoozeDuration={snoozeDuration}
        maxSnoozes={maxSnoozes}
        notificationStatus={notificationStatus}
        enableVibration={enableVibration}
        enableSound={enableSound}
        alarmSound={alarmSound}
        availableAlarmSounds={availableAlarmSounds}
        onBack={async () => {
          // Ayarlardan çıkarken çalan test sesini durdur
          await stopAlarmSound();
          setShowMenu(false);
          setShowSettings(false);
          // Kaydet butonuna basılmadığı için kaydetme
        }}
        onSave={async (settings) => {
          // Ayarlardan çıkarken çalan test sesini durdur
          await stopAlarmSound();
          
          // ÖNCE AsyncStorage'a kaydet (alarm her zaman buradan okuyacak)
          try {
            await AsyncStorage.setItem('snoozeDuration', settings.snoozeDuration.toString());
            await AsyncStorage.setItem('maxSnoozes', settings.maxSnoozes.toString());
            await AsyncStorage.setItem('enableVibration', settings.enableVibration.toString());
            await AsyncStorage.setItem('enableSound', settings.enableSound.toString());
            await AsyncStorage.setItem('alarmSound', settings.alarmSound);
            console.log('✅ Ayarlar AsyncStorage\'a kaydedildi:', settings.alarmSound);
          } catch (error) {
            console.error('Ayarlar kaydedilemedi:', error);
          }
          
          // SONRA REF'leri güncelle
          alarmSoundRef.current = settings.alarmSound;
          enableVibrationRef.current = settings.enableVibration;
          enableSoundRef.current = settings.enableSound;
          
          // SONRA state'i güncelle
          setSnoozeDuration(settings.snoozeDuration);
          setMaxSnoozes(settings.maxSnoozes);
          setEnableVibration(settings.enableVibration);
          setEnableSound(settings.enableSound);
          setAlarmSound(settings.alarmSound);
          
          setShowMenu(false);
          setShowSettings(false);
        }}
        onNotificationToggle={async (value) => {
          if (value) {
            await requestNotificationPermissionsAgain();
          } else {
            openSystemSettings();
          }
        }}
        onTestSound={playTestSound}
        onClearData={clearAllData}
      />
    );
  } else if (showStatistics) {
    // İstatistik ekranı
    content = (
      <StatisticsScreen
        onBack={() => {
          setShowMenu(false);
          setShowStatistics(false);
          setStatisticsView('today'); // İstatistikler sayfasından çıkıldığında her zaman 'Bugün' sekmesine sıfırla
        }}
        refreshKey={statisticsRefreshKey}
        statisticsView={statisticsView}
        setStatisticsView={setStatisticsView}
      />
    );
  } else if (showProfile) {
    // Profil ekranı
    content = (
      <ProfileScreen
        gender={gender}
        onBack={() => {
          setShowMenu(false);
          setShowProfile(false);
        }}
        onGenderChange={async (newGender) => {
          try {
            await AsyncStorage.setItem('gender', newGender);
            setGender(newGender);
          } catch (error) {
            console.error('Cinsiyet güncellenemedi:', error);
          }
        }}
      />
    );
  } else {
    // Ana ekran
    content = (
      <>
        <Header onMenuPress={() => setShowMenu(true)} />
        <Menu
          visible={showMenu}
          onClose={() => setShowMenu(false)}
          onStatisticsPress={() => {
            setShowStatistics(true);
            setShowMenu(false);
          }}
          onProfilePress={() => {
            setShowProfile(true);
            setShowMenu(false);
          }}
          onSettingsPress={() => {
            setShowSettings(true);
            setShowMenu(false);
          }}
        />
        <TimerScreen
          duration={duration}
          timeLeft={timeLeft}
          isRunning={isRunning}
          isAlarm={isAlarm}
          initialDuration={initialDuration}
          displayTime={displayTime}
          animatedStyle={animatedStyle}
          healthInfo={healthInfo}
          gender={gender}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          onDialRotate={handleDialRotate}
          onStart={startTimer}
          onStop={stopTimer}
        />
      </>
    );
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2196F3"
        translucent={false}
        hidden={isAlarm} 
      />
      <View style={styles.contentWrapper}>
        {content}
      </View>
      <CustomAlert />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#2196F3', // iOS'ta üst kısımda beyazlık kalmaması için mavi
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5', // İçerik arka planı açık gri
  },
});
