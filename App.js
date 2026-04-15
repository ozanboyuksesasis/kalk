/**
 * App.js — Kalk uygulaması
 *
 * Bildirim mimarisi: SADECE Android Foreground Service (TimerForegroundService.kt)
 * expo-notifications tamamen kaldırıldı.
 *
 * AsyncStorage tek anahtar: "timerEndTime" (epoch ms)
 *   - Yoksa  → idle
 *   - Gelecekte → running
 *   - Geçmişte → alarm
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Vibration,
  Animated,
  StatusBar,
  Platform,
  AppState,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AppContext } from './context/AppContext';
import RootNavigator from './navigation/RootNavigator';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './i18n';
import { useTranslation } from 'react-i18next';
import { getHealthMessage } from './utils/healthMessages';
import { startForegroundTimer, stopForegroundTimer, showTimerNotification, hideTimerNotification } from './services/foregroundTimer';
import CustomAlert, { showAlert } from './components/CustomAlert';

// NavigationContainer dışında tanımlı — her yerden erişilebilir
const navigationRef = createNavigationContainerRef();

// ─── AsyncStorage anahtarları ─────────────────────────────────────────────────
const KEY_TIMER_END    = 'timerEndTime';
const KEY_SNOOZE_COUNT = 'timerSnoozeCount';
const KEY_FIRST_SIT    = 'firstSittingDuration';
const KEY_TOTAL_SIT    = 'totalSittingDuration';

export default function App() {
  const { t } = useTranslation();

  // ─── UI state ───────────────────────────────────────────────────────────────
  const [duration,             setDuration]             = useState(0);
  const [timeLeft,             setTimeLeft]             = useState(null);
  const [isRunning,            setIsRunning]            = useState(false);
  const [isAlarm,              setIsAlarm]              = useState(false);
  const [initialDuration,      setInitialDuration]      = useState(null);
  const [snoozeDuration,       setSnoozeDuration]       = useState(5);
  const [maxSnoozes,           setMaxSnoozes]           = useState(3);
  const [snoozeCount,          setSnoozeCount]          = useState(0);
  const [notificationStatus,   setNotificationStatus]   = useState(null);
  const [firstSittingDuration, setFirstSittingDuration] = useState(null);
  const [totalSittingDuration, setTotalSittingDuration] = useState(null);
  const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0);
  const [enableVibration,      setEnableVibration]      = useState(true);
  const [enableSound,          setEnableSound]          = useState(true);
  const [alarmSound,           setAlarmSound]           = useState('alarm1');
  const [gender,               setGender]               = useState(null);
  const [isLoading,            setIsLoading]            = useState(true);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const intervalRef        = useRef(null);
  const timerEndRef        = useRef(null);
  const appStateRef        = useRef(AppState.currentState);
  const isAlarmRef         = useRef(false);
  const isRunningRef       = useRef(false);
  const soundRef           = useRef(null);
  const allSoundRefs       = useRef([]);
  const isPlayingRef       = useRef(false);
  const isAlarmStoppedRef  = useRef(false);
  const alarmSoundRef      = useRef('alarm1');
  const enableVibrationRef = useRef(true);
  const enableSoundRef     = useRef(true);
  const alarmPendingRef    = useRef(false);
  const rotation           = useRef(new Animated.Value(0)).current;

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // ─── Alarm sesleri ─────────────────────────────────────────────────────────
  const availableAlarmSounds = [
    { id: 'alarm1', label: 'Alarm 1', file: require('./assets/sounds/alarm1.wav') },
    { id: 'alarm2', label: 'Alarm 2', file: require('./assets/sounds/alarm2.wav') },
    { id: 'alarm3', label: 'Alarm 3', file: require('./assets/sounds/alarm3.wav') },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  //  TIMER STATE
  // ─────────────────────────────────────────────────────────────────────────────

  const getRemainingSeconds = () => {
    if (!timerEndRef.current) return null;
    return Math.max(0, Math.floor((timerEndRef.current - Date.now()) / 1000));
  };

  const restoreTimerState = async () => {
    if (isAlarmRef.current) return;

    try {
      const [endStr, snoozeStr, firstStr, totalStr] = await Promise.all([
        AsyncStorage.getItem(KEY_TIMER_END),
        AsyncStorage.getItem(KEY_SNOOZE_COUNT),
        AsyncStorage.getItem(KEY_FIRST_SIT),
        AsyncStorage.getItem(KEY_TOTAL_SIT),
      ]);

      if (snoozeStr) setSnoozeCount(parseInt(snoozeStr));
      if (firstStr)  setFirstSittingDuration(parseFloat(firstStr));
      if (totalStr)  setTotalSittingDuration(parseFloat(totalStr));

      if (!endStr) return;

      timerEndRef.current = parseInt(endStr);
      const remaining = getRemainingSeconds();

      if (remaining <= 0) {
        console.log('⏰ Timer süresi dolmuş, alarm tetikleniyor');
        await AsyncStorage.removeItem(KEY_TIMER_END);
        timerEndRef.current = null;
        triggerAlarm();
      } else {
        console.log('⏱ Timer devam ediyor, kalan:', remaining, 'sn');
        setIsRunning(true);
        isRunningRef.current = true;
        setTimeLeft(remaining);
        const initMin = firstStr ? parseFloat(firstStr) : Math.ceil(remaining / 60);
        setInitialDuration(initMin);
      }
    } catch (err) {
      console.error('restoreTimerState hatası:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  ALARM
  // ─────────────────────────────────────────────────────────────────────────────

  const triggerAlarm = async () => {
    if (isAlarmRef.current) return;
    isAlarmRef.current  = true;
    alarmPendingRef.current = true;

    console.log('🚨 triggerAlarm');

    // 1) Timer state sil — EN ÖNCE
    timerEndRef.current = null;
    AsyncStorage.removeItem(KEY_TIMER_END).catch(() => {});

    // 2) Interval durdur
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 3) Foreground service durdur
    stopForegroundTimer();

    // 4) State güncelle
    setIsRunning(false);
    setIsAlarm(true);
    setTimeLeft(0);
    isRunningRef.current = false;

    // 5) Ses & titreşim — HEMEN başlat (await öncesi),
    // böylece kullanıcı çok hızlı Kalktım'a basarsa bile
    // race condition'ı playAlarmSound içindeki guard yakalayabilir.
    if (enableVibrationRef.current) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
      }
    }
    if (enableSoundRef.current) {
      playAlarmSound(alarmSoundRef.current, true).catch(() => {});
    }

    // 6) Alarm ekranına geç
    const navigate = () => {
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Alarm' }] });
        alarmPendingRef.current = false;
      } else {
        setTimeout(navigate, 100);
      }
    };
    navigate();

    // 7) Yan verileri yükle (alarm zaten devrede, await OK)
    try {
      const [snoozeStr, firstStr, totalStr] = await Promise.all([
        AsyncStorage.getItem(KEY_SNOOZE_COUNT),
        AsyncStorage.getItem(KEY_FIRST_SIT),
        AsyncStorage.getItem(KEY_TOTAL_SIT),
      ]);
      if (snoozeStr) setSnoozeCount(parseInt(snoozeStr));
      if (firstStr)  setFirstSittingDuration(parseFloat(firstStr));
      if (totalStr)  setTotalSittingDuration(parseFloat(totalStr));
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  SES
  // ─────────────────────────────────────────────────────────────────────────────

  const _stopAllSounds = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
    for (const s of allSoundRefs.current) {
      try {
        const st = await s.getStatusAsync();
        if (st.isLoaded) { await s.stopAsync(); await s.unloadAsync(); }
      } catch (_) {}
    }
    allSoundRefs.current = [];
  };

  const playAlarmSound = async (soundType, soundEnabled) => {
    if (isPlayingRef.current || !soundEnabled) return;
    isPlayingRef.current = true;
    isAlarmStoppedRef.current = false;
    try {
      await _stopAllSounds();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });
      const selected = availableAlarmSounds.find(s => s.id === soundType) || availableAlarmSounds[0];
      const { sound } = await Audio.Sound.createAsync(selected.file, {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });
      // Race condition guard: yükleme sırasında stopAlarmSound çağrıldıysa
      // (kullanıcı çok hızlı Kalktım'a bastı) — sesi anında durdur.
      if (isAlarmStoppedRef.current || !isAlarmRef.current) {
        try { await sound.stopAsync(); } catch (_) {}
        try { await sound.unloadAsync(); } catch (_) {}
        return;
      }
      soundRef.current = sound;
      allSoundRefs.current.push(sound);
    } catch (err) {
      console.error('playAlarmSound hatası:', err);
    } finally {
      isPlayingRef.current = false;
    }
  };

  const stopAlarmSound = async () => {
    isAlarmStoppedRef.current = true;
    await _stopAllSounds();
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });
    } catch (_) {}
  };

  const playTestSound = async (soundType = null) => {
    if (!enableSound) return;
    const id = soundType || alarmSound;
    const selected = availableAlarmSounds.find(s => s.id === id) || availableAlarmSounds[0];
    try {
      await _stopAllSounds();
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(selected.file, { shouldPlay: true, isLooping: false, volume: 1.0 });
      soundRef.current = sound;
      setTimeout(async () => {
        try { await sound.stopAsync(); await sound.unloadAsync(); soundRef.current = null; } catch (_) {}
      }, 3000);
      sound.setOnPlaybackStatusUpdate(st => {
        if (st.didJustFinish) { sound.unloadAsync(); soundRef.current = null; }
      });
    } catch (err) {
      console.error('playTestSound hatası:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  TIMER BAŞLAT / DURDUR
  // ─────────────────────────────────────────────────────────────────────────────

  const startTimer = async (durationMin, snoozes = 0) => {
    if (!durationMin || durationMin <= 0) return;
    const seconds = Math.floor(durationMin * 60);
    if (seconds <= 0) return;

    const endTime = Date.now() + seconds * 1000;
    timerEndRef.current  = endTime;
    isAlarmRef.current   = false;
    isRunningRef.current = true;

    setTimeLeft(seconds);
    setIsRunning(true);
    setIsAlarm(false);
    setSnoozeCount(snoozes);
    setInitialDuration(durationMin);

    await AsyncStorage.setItem(KEY_TIMER_END, endTime.toString()).catch(() => {});

    if (snoozes === 0) {
      setFirstSittingDuration(durationMin);
      setTotalSittingDuration(durationMin);
      await Promise.all([
        AsyncStorage.setItem(KEY_SNOOZE_COUNT, '0'),
        AsyncStorage.setItem(KEY_FIRST_SIT, durationMin.toString()),
        AsyncStorage.setItem(KEY_TOTAL_SIT, durationMin.toString()),
      ]).catch(() => {});
    }

    stopForegroundTimer();
    hideTimerNotification();
    startForegroundTimer(endTime, t('notifications.title'), t('notifications.body'));

    console.log(`▶️ Timer: ${seconds}s, bitiş: ${new Date(endTime).toLocaleTimeString('tr-TR')}`);
  };

  const stopTimer = async () => {
    timerEndRef.current  = null;
    isAlarmRef.current   = false;
    isRunningRef.current = false;

    await AsyncStorage.removeItem(KEY_TIMER_END).catch(() => {});

    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    stopForegroundTimer();

    setIsRunning(false);
    setIsAlarm(false);
    setTimeLeft(null);
    setInitialDuration(null);
    setSnoozeCount(0);
    setFirstSittingDuration(null);
    setTotalSittingDuration(null);

    if (Platform.OS === 'android') Vibration.cancel();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  KALKTIM / ERTELE
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStandUp = () => {
    // 1) HEMEN: her şeyi kapat
    isAlarmRef.current        = false;
    isRunningRef.current      = false;
    timerEndRef.current       = null;
    isAlarmStoppedRef.current = true; // playAlarmSound loading guard'ı için
    AsyncStorage.removeItem(KEY_TIMER_END).catch(() => {});

    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (Platform.OS === 'android') Vibration.cancel();

    setIsAlarm(false);
    setIsRunning(false);

    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Timer' }] });
    }

    stopAlarmSound().catch(() => {});
    stopForegroundTimer();

    // Geç gelen titreşim/ses için çift güvence (loading bittikten sonra)
    setTimeout(() => {
      if (Platform.OS === 'android') Vibration.cancel();
      stopAlarmSound().catch(() => {});
    }, 600);

    // Arka planda: istatistik kaydet
    (async () => {
      try {
        const [snoozeStr, totalStr] = await Promise.all([
          AsyncStorage.getItem(KEY_SNOOZE_COUNT),
          AsyncStorage.getItem(KEY_TOTAL_SIT),
        ]);
        const finalSnooze = snoozeStr ? parseInt(snoozeStr) : snoozeCount;
        const finalTotal  = totalStr  ? parseFloat(totalStr) : (totalSittingDuration || 0);
        if (finalTotal > 0) await saveDailyStatistics({ totalDuration: finalTotal, snoozeCount: finalSnooze });
      } catch (_) {}
      await Promise.all([
        AsyncStorage.removeItem(KEY_SNOOZE_COUNT),
        AsyncStorage.removeItem(KEY_FIRST_SIT),
        AsyncStorage.removeItem(KEY_TOTAL_SIT),
      ]).catch(() => {});
      setSnoozeCount(0);
      setFirstSittingDuration(null);
      setTotalSittingDuration(null);
      setStatisticsRefreshKey(k => k + 1);
    })();
  };

  const handleSnooze = () => {
    if (snoozeCount >= maxSnoozes) return;

    isAlarmRef.current        = false;
    isAlarmStoppedRef.current = true; // playAlarmSound loading guard'ı için
    if (Platform.OS === 'android') Vibration.cancel();
    stopAlarmSound().catch(() => {});

    // Geç gelen titreşim/ses için çift güvence
    setTimeout(() => {
      if (Platform.OS === 'android') Vibration.cancel();
    }, 600);

    const newSnoozeCount  = snoozeCount + 1;
    const newTotalSitting = (totalSittingDuration || 0) + snoozeDuration;

    setSnoozeCount(newSnoozeCount);
    setTotalSittingDuration(newTotalSitting);
    setIsAlarm(false);

    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Timer' }] });
    }

    (async () => {
      await AsyncStorage.setItem(KEY_SNOOZE_COUNT, newSnoozeCount.toString()).catch(() => {});
      await AsyncStorage.setItem(KEY_TOTAL_SIT, newTotalSitting.toString()).catch(() => {});
      await startTimer(snoozeDuration, newSnoozeCount);
    })();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  İSTATİSTİKLER
  // ─────────────────────────────────────────────────────────────────────────────

  const saveDailyStatistics = async (sessionData) => {
    try {
      const today    = new Date().toISOString().split('T')[0];
      const statsKey = `dailyStats_${today}`;
      const existing = await AsyncStorage.getItem(statsKey);
      const stats    = existing
        ? JSON.parse(existing)
        : { totalSittingTime: 0, alarmCount: 0, snoozeCount: 0, sessions: [] };
      stats.totalSittingTime += sessionData.totalDuration || 0;
      stats.alarmCount       += 1;
      stats.snoozeCount      += sessionData.snoozeCount || 0;
      stats.sessions.push({
        duration:  sessionData.totalDuration || 0,
        snoozes:   sessionData.snoozeCount || 0,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
    } catch (err) {
      console.error('saveDailyStatistics hatası:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  AYARLAR
  // ─────────────────────────────────────────────────────────────────────────────

  const loadSettings = async () => {
    try {
      const [snoozeD, maxSn, vibr, snd, track, gen] = await Promise.all([
        AsyncStorage.getItem('snoozeDuration'),
        AsyncStorage.getItem('maxSnoozes'),
        AsyncStorage.getItem('enableVibration'),
        AsyncStorage.getItem('enableSound'),
        AsyncStorage.getItem('alarmSound'),
        AsyncStorage.getItem('gender'),
      ]);
      if (snoozeD) setSnoozeDuration(parseInt(snoozeD));
      if (maxSn)   setMaxSnoozes(parseInt(maxSn));
      if (vibr !== null) {
        const v = vibr === 'true';
        setEnableVibration(v);
        enableVibrationRef.current = v;
      }
      if (snd !== null) {
        const s = snd === 'true';
        setEnableSound(s);
        enableSoundRef.current = s;
      }
      const soundId = track && availableAlarmSounds.some(s => s.id === track) ? track : 'alarm1';
      setAlarmSound(soundId);
      alarmSoundRef.current = soundId;
      if (gen === 'male' || gen === 'female') setGender(gen);

      await restoreTimerState();
    } catch (err) {
      console.error('loadSettings hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsSave = async (settings) => {
    await stopAlarmSound();
    try {
      await Promise.all([
        AsyncStorage.setItem('snoozeDuration',  settings.snoozeDuration.toString()),
        AsyncStorage.setItem('maxSnoozes',       settings.maxSnoozes.toString()),
        AsyncStorage.setItem('enableVibration',  settings.enableVibration.toString()),
        AsyncStorage.setItem('enableSound',      settings.enableSound.toString()),
        AsyncStorage.setItem('alarmSound',       settings.alarmSound),
      ]);
      showAlert(t('common.ok'), t('settings.saveSuccess'), [{ text: t('common.ok'), onPress: () => {} }]);
    } catch (_) {
      showAlert(t('settings.clearDataErrorTitle'), t('settings.clearDataError'), [{ text: t('common.ok'), onPress: () => {} }]);
    }
    alarmSoundRef.current      = settings.alarmSound;
    enableVibrationRef.current = settings.enableVibration;
    enableSoundRef.current     = settings.enableSound;
    setSnoozeDuration(settings.snoozeDuration);
    setMaxSnoozes(settings.maxSnoozes);
    setEnableVibration(settings.enableVibration);
    setEnableSound(settings.enableSound);
    setAlarmSound(settings.alarmSound);
  };

  const handleGenderSelect = async (g) => {
    await AsyncStorage.setItem('gender', g).catch(() => {});
    setGender(g);
  };
  const handleGenderChange = handleGenderSelect;

  const clearAllData = async (setLoading) => {
    showAlert(
      t('settings.clearData'),
      t('settings.clearDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        {
          text: t('settings.clearButton'),
          style: 'destructive',
          onPress: async () => {
            if (setLoading) setLoading(true);
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('dailyStats_')));
              await AsyncStorage.multiRemove([
                KEY_TIMER_END, KEY_SNOOZE_COUNT, KEY_FIRST_SIT, KEY_TOTAL_SIT,
              ]);
              setSnoozeCount(0); setFirstSittingDuration(null);
              setTotalSittingDuration(null); setDuration(0);
              setIsRunning(false); setTimeLeft(null); setInitialDuration(null);
              if (setLoading) setLoading(false);
              showAlert(t('settings.clearDataSuccessTitle'), t('settings.clearDataSuccess'), [{ text: t('common.ok'), onPress: () => {} }]);
            } catch (_) {
              if (setLoading) setLoading(false);
              showAlert(t('settings.clearDataErrorTitle'), t('settings.clearDataError'), [{ text: t('common.ok'), onPress: () => {} }]);
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  İZİNLER
  // ─────────────────────────────────────────────────────────────────────────────

  /** Android 13+ (API 33) POST_NOTIFICATIONS runtime permission */
  const checkAndroidNotifPermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true; // Android 12 ve altı — izin gerekmiyor
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch (_) {
      return true;
    }
  };

  const requestAndroidNotifPermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Bildirim İzni',
          message: 'Oturma süresi dolduğunda sizi uyarabilmek için bildirim izni gereklidir.',
          buttonPositive: 'İzin Ver',
          buttonNegative: 'Reddet',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (_) {
      return false;
    }
  };

  /** Uygulamanın bildirim ayarları sayfasını aç (kanal bazlı) */
  const openNotificationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: 'com.kalk.app' },
        ]);
      } else {
        await Linking.openSettings();
      }
    } catch (_) {
      // Fallback: genel uygulama ayarları
      Linking.openSettings().catch(() => {});
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return;
    if (Platform.Version >= 33) {
      // Android 13+: çalışma zamanı izni gerekli
      const already = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      ).catch(() => false);
      if (already) {
        setNotificationStatus('granted');
        return;
      }
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Bildirim İzni',
          message: 'Oturma süresi dolduğunda alarm alabilmek için bildirim izni gereklidir.',
          buttonPositive: 'İzin Ver',
          buttonNegative: 'Reddet',
        }
      ).catch(() => 'denied');
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setNotificationStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        showAlert(
          'Bildirim İzni Gerekli',
          'Bildirimsiz alarm çalamaz. Lütfen bildirim ayarlarından Kalk uygulamasını açın.',
          [
            { text: 'Şimdi Değil', style: 'cancel', onPress: () => {} },
            { text: 'Bildirim Ayarları', onPress: openNotificationSettings },
          ]
        );
      }
    } else {
      // Android 12 ve altı — runtime izni gereksiz
      setNotificationStatus('granted');
    }
  };

  const checkNotificationPermissions = async () => {
    const granted = await checkAndroidNotifPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (!granted) {
      showAlert(
        'Bildirimler Kapalı',
        'Kalk uygulamasının bildirimleri kapalı. Alarm çalabilmesi için bildirimleri açmanız gerekiyor.',
        [
          { text: 'İptal', style: 'cancel', onPress: () => {} },
          { text: 'Bildirim Ayarları', onPress: openNotificationSettings },
        ]
      );
    } else {
      showAlert(
        t('settings.notificationPermission'),
        t('notifications.permissionStatus', { status: t('settings.granted') }),
        [{ text: t('common.ok'), onPress: () => {} }]
      );
    }
  };

  const requestNotificationPermissionsAgain = async () => {
    // Önce tekrar izin iste
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Bildirim İzni',
        message: 'Alarm için bildirim izni gereklidir.',
        buttonPositive: 'İzin Ver',
        buttonNegative: 'Reddet',
      }
    ).catch(() => 'denied');
    const granted = Platform.Version < 33
      ? true
      : result === PermissionsAndroid.RESULTS.GRANTED;
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (!granted) {
      // Reddedildiyse direkt bildirim ayarlarına gönder
      showAlert(
        'Bildirimler Kapalı',
        'Bildirim izni verilmedi. Ayarlardan bildirimleri manuel olarak açın.',
        [
          { text: 'İptal', style: 'cancel', onPress: () => {} },
          { text: 'Bildirim Ayarları', onPress: openNotificationSettings },
        ]
      );
    }
  };

  const openSystemSettings = openNotificationSettings;

  const requestBatteryOptimizationExemption = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const already = await AsyncStorage.getItem('BATTERY_OPT_PROMPTED');
      if (already === 'true') return;
      await AsyncStorage.setItem('BATTERY_OPT_PROMPTED', 'true');
      showAlert(
        'Arka Plan İzni',
        'Uygulama kapalıyken de bildirim gelebilmesi için pil optimizasyonundan muaf tutulması gerekiyor.\n\nAçılan ekranda "Kısıtlama Yok" seçeneğini seç.',
        [
          { text: 'Şimdi Değil', style: 'cancel', onPress: () => {} },
          {
            text: 'Ayarları Aç',
            onPress: async () => {
              try {
                await Linking.sendIntent(
                  'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
                  [{ key: 'package', value: 'com.kalk.app' }]
                );
              } catch (_) {
                Linking.openSettings().catch(() => {});
              }
            },
          },
        ]
      );
    } catch (_) {}
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  DIAL KONTROLLER
  // ─────────────────────────────────────────────────────────────────────────────

  const handleIncrease = () => {
    if (isRunning || isAlarm) return;
    const cur = Math.round((duration || 0) * 60);
    const nxt = Math.min(180 * 60, cur + 10);
    setDuration(nxt <= 0 ? null : Math.round((nxt / 60) * 10000) / 10000);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Vibration.vibrate(10);
  };

  const handleDecrease = () => {
    if (isRunning || isAlarm) return;
    const cur = Math.round((duration || 0) * 60);
    const nxt = Math.max(0, cur - 10);
    setDuration(nxt <= 0 ? null : Math.round((nxt / 60) * 10000) / 10000);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else Vibration.vibrate(10);
  };

  const handleDialRotate = (angle) => {
    if (isRunning || isAlarm) return;
    const nd = Math.min(120, Math.max(0, (angle / 360) * 120));
    setDuration(nd <= 0 ? null : nd);
    if (nd > 0 && nd % 10 === 0) {
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else Vibration.vibrate(10);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // İlk yükleme
  useEffect(() => {
    loadSettings();
    requestPermissions();
    requestBatteryOptimizationExemption();
  }, []);

  // Geri sayım interval
  useEffect(() => {
    if (!isRunning || isAlarm) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    const tick = () => {
      const remaining = getRemainingSeconds();
      if (remaining === null) return;
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (!isAlarmRef.current) triggerAlarm();
        setTimeLeft(0);
      } else {
        setTimeLeft(r => r === remaining ? r : remaining);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isRunning, isAlarm]);

  // AppState — arka plan/ön plan
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        console.log('📱 Ön plana geldi');

        // Bildirim izin durumunu güncelle
        checkAndroidNotifPermission().then(g => setNotificationStatus(g ? 'granted' : 'denied'));

        // Timer varsa bildirimi gizle
        if (isRunningRef.current) hideTimerNotification();

        if (isAlarmRef.current) return;

        await restoreTimerState();

        // Interval yoksa yeniden başlat
        if (isRunningRef.current && timerEndRef.current && !intervalRef.current) {
          const tick = () => {
            const remaining = getRemainingSeconds();
            if (remaining === null) return;
            if (remaining <= 0) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              if (!isAlarmRef.current) triggerAlarm();
              setTimeLeft(0);
            } else {
              setTimeLeft(r => r === remaining ? r : remaining);
            }
          };
          tick();
          intervalRef.current = setInterval(tick, 1000);
        }

      } else if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        console.log('📱 Arka plana geçti');
        // Timer varsa bildirimi göster
        if (isRunningRef.current) showTimerNotification();
      }
    });
    return () => sub.remove();
  }, []);

  // Bekleyen alarm navigate
  useEffect(() => {
    if (!isLoading && alarmPendingRef.current && isAlarmRef.current && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Alarm' }] });
      alarmPendingRef.current = false;
    }
  }, [isLoading]);

  // Dial animasyonu
  useEffect(() => {
    Animated.spring(rotation, {
      toValue: (duration / 10) * 0.3,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [duration]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  HESAPLAMALAR
  // ─────────────────────────────────────────────────────────────────────────────

  const healthInfo    = getHealthMessage(duration, t);
  const displayTime   = (timeLeft !== null && !isNaN(timeLeft)) ? timeLeft / 60 : (duration || 0);
  const animatedStyle = {
    transform: [{
      rotate: rotation.interpolate({ inputRange: [-15, 15], outputRange: ['-15rad', '15rad'] }),
    }],
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────

  const appContextValue = {
    duration, setDuration,
    timeLeft,
    isRunning,
    isAlarm,
    initialDuration,
    isLoading,
    snoozeDuration,
    maxSnoozes,
    snoozeCount,
    enableVibration,
    enableSound,
    alarmSound,
    gender,
    notificationStatus,
    firstSittingDuration,
    totalSittingDuration,
    statisticsRefreshKey,
    availableAlarmSounds,
    displayTime,
    animatedStyle,
    healthInfo,
    intervalRef,
    startTimer:                        () => startTimer(duration, 0),
    stopTimer,
    handleSnooze,
    handleStandUp,
    handleGenderSelect,
    handleGenderChange,
    handleSettingsSave,
    handleIncrease,
    handleDecrease,
    handleDialRotate,
    playTestSound,
    clearAllData,
    stopAlarmSound,
    checkNotificationPermissions,
    requestNotificationPermissionsAgain,
    openSystemSettings,
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#2196F3"
          translucent={false}
          hidden={isAlarm}
        />
        <RootNavigator />
        <CustomAlert />
      </NavigationContainer>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({});
