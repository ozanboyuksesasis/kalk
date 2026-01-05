import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCountdown } from '../utils/formatTime';

const TodayStatistics = ({ refreshKey }) => {
  const { t } = useTranslation();
  const [dailyStats, setDailyStats] = useState(null); // null = henüz yüklenmedi
  const [yesterdayStats, setYesterdayStats] = useState(null); // Dünkü veriler
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

      // Dünkü verileri yükle
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];
      const yesterdayStatsKey = `dailyStats_${yesterdayDate}`;
      const yesterdayStatsData = await AsyncStorage.getItem(yesterdayStatsKey);
      
      if (yesterdayStatsData) {
        const parsedYesterday = JSON.parse(yesterdayStatsData);
        console.log('📊 Dünkü veri yüklendi:', {
          date: yesterdayDate,
          totalSittingTime: parsedYesterday.totalSittingTime,
        });
        setYesterdayStats(parsedYesterday);
      } else {
        console.log('📊 Dünkü veri bulunamadı:', yesterdayDate);
        setYesterdayStats(null);
      }
      
      // Debug: Bugünkü ve dünkü verileri logla
      if (stats) {
        const todayData = JSON.parse(stats);
        console.log('📊 Bugünkü veri:', {
          totalSittingTime: todayData.totalSittingTime,
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
      setYesterdayStats(null);
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

      {/* Düne Göre Karşılaştırma - Sadece dünkü veri varsa göster */}
      {dailyStats && yesterdayStats !== null && (
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>{t('statistics.comparedToYesterday')}</Text>
          {(() => {
            const todayMinutes = Math.floor(dailyStats.totalSittingTime || 0);
            const yesterdayMinutes = Math.floor(yesterdayStats?.totalSittingTime || 0);
            const difference = todayMinutes - yesterdayMinutes;
            
            console.log('📊 Karşılaştırma:', {
              today: todayMinutes,
              yesterday: yesterdayMinutes,
              difference: difference,
            });
            
            if (difference > 0) {
              return (
                <Text style={[styles.comparisonText, styles.comparisonMore]}>
                  📈 {t('statistics.moreThanYesterday', { minutes: difference })}
                </Text>
              );
            } else if (difference < 0) {
              return (
                <Text style={[styles.comparisonText, styles.comparisonLess]}>
                  📉 {t('statistics.lessThanYesterday', { minutes: Math.abs(difference) })}
                </Text>
              );
            } else {
              return (
                <Text style={[styles.comparisonText, styles.comparisonSame]}>
                  ➡️ {t('statistics.sameAsYesterday')}
                </Text>
              );
            }
          })()}
        </View>
      )}

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
  comparisonCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  comparisonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  comparisonMore: {
    color: '#D32F2F',
  },
  comparisonLess: {
    color: '#388E3C',
  },
  comparisonSame: {
    color: '#1976D2',
  },
  comparisonNoData: {
    color: '#757575',
    fontStyle: 'italic',
  },
});

export default TodayStatistics;

