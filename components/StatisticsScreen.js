import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import TodayStatistics from './TodayStatistics';
import AllTimeStatistics from './AllTimeStatistics';

const StatisticsScreen = ({
  onBack,
  refreshKey, // İstatistikleri yenilemek için key
  statisticsView, // Sekme seçimi ('today' veya 'all')
  setStatisticsView, // Sekme seçimini değiştirme fonksiyonu
}) => {
  // Eğer statisticsView undefined ise veya geçersiz bir değer ise 'today' olarak ayarla
  const currentView = statisticsView === 'today' || statisticsView === 'all' ? statisticsView : 'today';
  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
    >
      <View style={styles.statisticsContainer}>
        <View style={styles.statisticsHeader}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={onBack}
          >
            <Text style={styles.backButtonSmallText}>◀ Geri</Text>
          </TouchableOpacity>
          <Text style={styles.statisticsTitle}>İstatistikler</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Bugün/Tüm Zamanlar Toggle */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              { backgroundColor: currentView === 'today' ? '#4CAF50' : 'transparent' },
            ]}
            onPress={() => setStatisticsView('today')}
          >
            <Text style={[
              styles.viewToggleText,
              { 
                color: currentView === 'today' ? '#fff' : '#666',
                fontWeight: currentView === 'today' ? 'bold' : '600',
              },
            ]}>
              Bugün
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              { backgroundColor: currentView === 'all' ? '#4CAF50' : 'transparent' },
            ]}
            onPress={() => setStatisticsView('all')}
          >
            <Text style={[
              styles.viewToggleText,
              { 
                color: currentView === 'all' ? '#fff' : '#666',
                fontWeight: currentView === 'all' ? 'bold' : '600',
              },
            ]}>
              Tüm Zamanlar
            </Text>
          </TouchableOpacity>
        </View>

        {currentView === 'today' ? (
          <TodayStatistics refreshKey={refreshKey} />
        ) : (
          <AllTimeStatistics refreshKey={refreshKey} />
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
    paddingBottom: 80,
  },
  statisticsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  statisticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 0,
  },
  backButtonSmall: {
    padding: 8,
  },
  backButtonSmallText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  statisticsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default StatisticsScreen;

