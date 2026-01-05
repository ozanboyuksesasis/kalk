import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform, Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCountdown } from '../utils/formatTime';

const { height } = Dimensions.get('window');

const AlarmScreen = ({
  totalSittingDuration,
  snoozeCount,
  maxSnoozes,
  snoozeDuration,
  onSnooze,
  onStandUp,
  stopAlarmSound, // Ses durdurma fonksiyonu
  intervalRef, // Interval referansı
}) => {
  const { t } = useTranslation();
  // Component mount olduğunda ses/titreşim durdurma garantisi
  useEffect(() => {
    return () => {
      // Component unmount olduğunda temizlik
      if (intervalRef?.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
  
  // onStandUp çağrıldığında ses ve titreşimi durdur
  const handleStandUpRef = useRef(false); // Çift tıklama önleme
  
  const handleStandUp = () => {
    // ÇİFT TIKLAMA ÖNLEME
    if (handleStandUpRef.current) {
      console.log('⚠️ handleStandUp zaten işleniyor, atlanıyor...');
      return;
    }
    
    handleStandUpRef.current = true;
    console.log('🔔 AlarmScreen: handleStandUp çağrıldı');
    
    // HEMEN: Interval'ı durdur
    if (intervalRef?.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ AlarmScreen: Interval durduruldu');
    }
    
    // HEMEN: Titreşimi durdur
    if (Platform.OS === 'android') {
      Vibration.cancel();
      console.log('📳 AlarmScreen: Android titreşim durduruldu');
    }
    
    // HEMEN: Parent'a bildir (alarm ekranı hemen kapansın)
    if (onStandUp) {
      onStandUp();
    }
    
    // ARKA PLANDA: Ses durdurma (await etmeden, non-blocking)
    if (stopAlarmSound) {
      stopAlarmSound().catch(err => console.error('Ses durdurma hatası:', err));
    }
    
    // Flag'i sıfırla (kısa bir gecikme ile - çift tıklama önleme için)
    setTimeout(() => {
      handleStandUpRef.current = false;
    }, 100);
  };
  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
      scrollEnabled={false}
      pointerEvents="box-none"
    >
      <View style={styles.alarmContainer}>
        <Text style={styles.alarmIcon}>🔔</Text>
        <Text style={styles.alarmTitle}>{t('alarm.title')}</Text>
        <Text style={styles.alarmSubtitle}>
          {t('alarm.subtitle')}
        </Text>
        
        {/* Özet Bilgiler */}
        {totalSittingDuration !== null && totalSittingDuration > 0 && (
          <View style={styles.alarmSummary}>
            <Text style={styles.summaryMainText}>
              {String(formatCountdown(Math.floor((totalSittingDuration || 0) * 60), t) || `0 ${t('timer.secondsShort')}`)} {t('alarm.sittingFor')}
            </Text>
          </View>
        )}
        
        <View style={styles.alarmControls}>
          {snoozeCount < maxSnoozes && (
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={onSnooze}
            >
              <Text style={styles.snoozeButtonText}>
                {`${t('alarm.snooze')} (${String(snoozeDuration || 0)}${t('timer.minutes')})`}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.standUpButton} 
            onPress={handleStandUp}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Text style={styles.standUpButtonText}>{t('alarm.standUp')} ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  scrollContent: {
    flexGrow: 1,
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
  alarmSummary: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 24,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryMainText: {
    fontSize: 22,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AlarmScreen;

