import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Platform, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatTime, formatCountdown } from '../utils/formatTime';
import { getHealthMessage } from '../utils/healthMessages';
import OvalTimerDial from './OvalTimerDial';

const { width } = Dimensions.get('window');

// Tek bir DIAL_SIZE kullan (tutarlılık için)
const DIAL_SIZE = Math.min(width * 0.65, 220);

const TimerScreen = ({
  duration,
  timeLeft,
  isRunning,
  isAlarm = false,
  initialDuration,
  displayTime,
  animatedStyle,
  healthInfo,
  gender = null,
  onIncrease,
  onDecrease,
  onDialRotate,
  onStart,
  onStop,
}) => {
  const scrollViewRef = useRef(null);
  const { t } = useTranslation();

  // OvalTimerDial onChange handler - dakika cinsinden değeri açıya çevir
  const handleDialChange = (minutes) => {
    // Timer çalışıyorsa veya alarm açıksa halkayı pasif yap
    if (isRunning || isAlarm) {
      return;
    }
    if (onDialRotate) {
      // Dakikayı açıya çevir (120 dakika = 360 derece)
      const angle = (minutes / 120) * 360;
      onDialRotate(angle);
    }
  };
  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
    >
      {/* Çalar Saat İkonu ile Yuvarlak Progress Göstergesi */}
      <View style={styles.dialContainer}>
        <View style={styles.dialWrapper}>
          {/* OvalTimerDial Component */}
          <OvalTimerDial
            size={DIAL_SIZE}
            strokeWidth={12}
            onChange={handleDialChange}
            isRunning={isRunning}
            isAlarm={isAlarm}
            duration={duration}
            scrollViewRef={scrollViewRef}
          />
          {/* İçindeki yürüyen insan ikonu (cinsiyete göre) */}
          <View style={styles.dialInner} pointerEvents="none">
            <Text style={styles.walkIcon}>
              {gender === 'female' ? '🚶‍♀️' : '🚶'}
            </Text>
          </View>
        </View>

        {/* +/- Butonları (Test için 10 saniye) */}
        <View style={styles.dialControls}>
          <TouchableOpacity
            style={styles.rotateButton}
            onPress={onDecrease}
            disabled={isRunning || isAlarm}
          >
            <Text style={styles.rotateButtonText}>{t('timer.decrease10')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rotateButton}
            onPress={onIncrease}
            disabled={isRunning || isAlarm}
          >
            <Text style={styles.rotateButtonText}>{t('timer.increase10')}</Text>
          </TouchableOpacity>
        </View>
        
      </View>

      {/* Süre Gösterimi */}
      <View style={styles.timeContainer}>
        {!isRunning ? (
          (duration === null || duration === undefined || isNaN(duration) || duration <= 0) ? (
            <Text style={styles.timeText}>{t('timer.setTime')}</Text>
          ) : (
            <Text style={styles.timeText}>
              {String(formatTime(displayTime || 0, t) || `0 ${t('timer.secondsShort')} ${t('timer.afterStandUp')}`)}
            </Text>
          )
        ) : (
          <>
            <Text style={styles.timeText}>
              {String(formatTime((initialDuration !== null && initialDuration !== undefined && !isNaN(initialDuration) ? initialDuration : (duration !== null && duration !== undefined && !isNaN(duration) ? duration : 0)) || 0, t) || `0 ${t('timer.secondsShort')} ${t('timer.afterStandUp')}`)} ✓
            </Text>
            {(() => {
              const totalSeconds = (timeLeft !== null && timeLeft !== undefined && !isNaN(timeLeft) ? timeLeft : 0) || 0;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              
              const timeParts = [];
              if (hours > 0) timeParts.push(`${hours} ${t('timer.hoursShort')}`);
              if (minutes > 0) timeParts.push(`${minutes} ${t('timer.minutesShort')}`);
              
              // Eğer sadece saniye varsa tek satırda göster
              if (hours === 0 && minutes === 0) {
                return (
                  <Text style={styles.countdownText}>
                    {String(seconds)} {t('timer.secondsShort')}
                  </Text>
                );
              }
              
              // Saat veya dakika varsa iki satırda göster
              return (
                <>
                  <Text style={styles.countdownText}>
                    {timeParts.join(' ')}
                  </Text>
                  <Text style={styles.countdownSecondsText}>
                    {String(seconds)} {t('timer.secondsShort')}
                  </Text>
                </>
              );
            })()}
          </>
        )}
      </View>

      {/* Sağlık Bilgisi */}
      {duration > 0 && healthInfo && healthInfo.message && (
        <View style={[styles.healthContainer, { backgroundColor: ((healthInfo.color || '#999') + '20') }]}>
          <Text style={[styles.healthText, { color: healthInfo.color || '#999' }]}>
            {String(healthInfo.message || '')}
          </Text>
        </View>
      )}

      {/* Kontrol Butonları */}
      <View style={styles.controls}>
        {!isRunning ? (
          duration > 0 ? (
            <TouchableOpacity style={styles.startButton} onPress={onStart}>
              <Text style={styles.startButtonText}>{t('timer.start')}</Text>
            </TouchableOpacity>
          ) : null
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={onStop}>
            <Text style={styles.stopButtonText}>{t('timer.stop')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 150 : 80,
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Dokunma için aktif alan
  },
  dialInner: {
    width: DIAL_SIZE * 0.72 * 1.25, // 1.25 katına çıkar
    height: DIAL_SIZE * 0.72 * 1.25, // 1.25 katına çıkar
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(DIAL_SIZE * 0.72 * 1.25) / 2,
    marginLeft: -(DIAL_SIZE * 0.72 * 1.25) / 2,
    backgroundColor: '#fff',
    borderRadius: (DIAL_SIZE * 0.72 * 1.25) / 2,
    // Forest app tarzı: shadow ve border yok, sadece düz beyaz
    zIndex: 3,
  },
  walkIcon: {
    fontSize: 96,
  },
  dialControls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: 'bold',
    color: '#333',
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
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
  },
  countdownSecondsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
  },
  healthContainer: {
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
  },
  healthText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: 20,
    marginTop: 30,
    alignItems: 'stretch',
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
});

export default TimerScreen;

