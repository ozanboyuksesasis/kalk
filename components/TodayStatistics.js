import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCountdown } from '../utils/formatTime';

const TodayStatistics = ({ refreshKey }) => {
  const { t } = useTranslation();
  const [dailyStats, setDailyStats] = useState(null); // null = henüz yüklenmedi
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDailyStatistics();
  }, [refreshKey]); // refreshKey değiştiğinde verileri yeniden yükle

  const loadDailyStatistics = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `dailyStats_${today}`;
      const stats = await AsyncStorage.getItem(statsKey);
      
      if (stats) {
        setDailyStats(JSON.parse(stats));
      } else {
        setDailyStats({
          totalSittingTime: 0,
          alarmCount: 0,
          snoozeCount: 0,
          sessions: [],
        });
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
      setDailyStats({
        totalSittingTime: 0,
        alarmCount: 0,
        snoozeCount: 0,
        sessions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Veriler yüklenene kadar hiçbir şey gösterme (flash önleme)
  if (isLoading || dailyStats === null) {
    return null;
  }

  return (
    <>
      {/* Bugünün Özeti */}
      <View style={styles.todayStatCard}>
        <View style={styles.todayStatContent}>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>⏱️</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(formatCountdown(Math.floor((dailyStats?.totalSittingTime || 0) * 60), t) || `0 ${t('timer.secondsShort')}`) || `0 ${t('timer.secondsShort')}`}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.sittingTime')}</Text>
            </View>
          </View>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>🔔</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(dailyStats?.alarmCount || 0)}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.alarmSet')}</Text>
            </View>
          </View>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>⏰</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(dailyStats?.snoozeCount || 0)}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.alarmSnoozed')}</Text>
            </View>
          </View>
        </View>
      </View>

      {(!dailyStats?.totalSittingTime || dailyStats.totalSittingTime <= 0) && (
        <View style={styles.emptyStatsContainer}>
          <Text style={styles.emptyStatsText}>{t('statistics.noData')}</Text>
          <Text style={styles.emptyStatsSubtext}>
            {t('statistics.noDataSubtext')}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  todayStatCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  todayStatContent: {
    gap: 16,
  },
  todayStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  todayStatEmoji: {
    fontSize: 32,
  },
  todayStatTextContainer: {
    flex: 1,
  },
  todayStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  todayStatLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStatsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptyStatsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default TodayStatistics;

