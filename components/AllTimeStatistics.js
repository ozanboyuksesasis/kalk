import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCountdown } from '../utils/formatTime';

const { width } = Dimensions.get('window');

const AllTimeStatistics = ({ refreshKey }) => {
  const { t } = useTranslation();
  const [allTimeStats, setAllTimeStats] = useState(null); // null = henüz yüklenmedi
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [allStatsKeys, setAllStatsKeys] = useState([]);
  const [loadedDataRange, setLoadedDataRange] = useState({ start: 0, end: 30 });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lineChartScrollRef = useRef(null);
  const scrollOffsetX = useRef(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadAllTimeStatistics();
    // refreshKey değiştiğinde isInitialLoad'u sıfırlama (scroll pozisyonunu koru)
    // Sadece component ilk mount olduğunda isInitialLoad true olmalı
  }, [refreshKey]); // refreshKey değiştiğinde verileri yeniden yükle

  // İlk yüklemede scroll'u en sağa kaydır - animasyonsuz ve anında
  // refreshKey değiştiğinde (yenileme) scroll pozisyonunu koru, sadece ilk yüklemede scroll yap
  useEffect(() => {
    if (allTimeStats && allTimeStats?.dailyData && allTimeStats.dailyData.length > 0 && !isLoadingChart) {
      // isInitialLoad sadece component ilk mount olduğunda true olmalı
      // refreshKey değiştiğinde (yenileme) isInitialLoad false kalmalı (scroll pozisyonu korunur)
      if (isInitialLoad.current) {
        // requestAnimationFrame kullanarak render'dan hemen sonra scroll yap
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (lineChartScrollRef.current) {
              const dataCount = allTimeStats.dailyData.length;
              const minPadding = 20;
              const rightPadding = 20; // Sağ tarafta da padding
              // Padding'i hesaba katarak grafik genişliğini hesapla
              const chartWidth = dataCount === 1 ? Math.max(minPadding, (width - 90) / 2 - 5) + rightPadding : (minPadding + dataCount * 18 + rightPadding);
              const visibleWidth = width - 90;
              const scrollableWidth = Math.max(0, chartWidth - visibleWidth + 30);
              
              if (scrollableWidth > 0) {
                lineChartScrollRef.current.scrollTo({
                  x: scrollableWidth,
                  animated: false,
                });
                scrollOffsetX.current = scrollableWidth;
              } else {
                lineChartScrollRef.current.scrollTo({
                  x: 0,
                  animated: false,
                });
                scrollOffsetX.current = 0;
              }
              isInitialLoad.current = false;
            }
          });
        });
      }
    }
  }, [allTimeStats?.dailyData?.length || 0, isLoadingChart]);

  // Lazy loading: Belirli bir aralıktaki verileri yükle
  const loadDataRange = async (startIndex, endIndex, allKeys) => {
    if (startIndex < 0 || endIndex > allKeys.length || startIndex >= endIndex) {
      console.log('⚠️ loadDataRange: Geçersiz aralık', { startIndex, endIndex, totalKeys: allKeys.length });
      return [];
    }
    
    const keysToLoad = allKeys.slice(startIndex, endIndex);
    console.log('📥 Veri yükleniyor:', {
      aralik: `${startIndex}-${endIndex}`,
      yuklenecekKayitSayisi: keysToLoad.length,
    });
    
    const savedData = await AsyncStorage.multiGet(keysToLoad);
    const dailyData = [];
    
    savedData.forEach(([key, value]) => {
      if (value) {
        const dateStr = key.replace('dailyStats_', '');
        const dayStats = JSON.parse(value);
        dailyData.push({
          date: dateStr,
          totalTime: dayStats.totalSittingTime || 0,
          sessions: dayStats.sessions || [],
        });
      }
    });
    
    console.log('📦 Veri yüklendi:', {
      yuklenenKayitSayisi: dailyData?.length || 0,
      aralik: `${startIndex || 0}-${endIndex || 0}`,
    });
    
    return dailyData.sort((a, b) => a.date.localeCompare(b.date));
  };

  const loadAllTimeStatistics = async () => {
    try {
      setIsLoadingChart(true);
      
      const keys = await AsyncStorage.getAllKeys();
      const statsKeys = keys.filter(key => key.startsWith('dailyStats_'));
      
      // Sadece gerçek veriler olan key'leri kullan (dummy key oluşturma yok)
      statsKeys.sort((a, b) => {
        const dateA = a.replace('dailyStats_', '');
        const dateB = b.replace('dailyStats_', '');
        return dateA.localeCompare(dateB);
      });
      
      setAllStatsKeys(statsKeys);
      
      const initialEnd = statsKeys.length;
      const initialStart = Math.max(0, initialEnd - 30);
      console.log('📊 İlk yükleme:', {
        toplamKayit: statsKeys.length || 0,
        yuklenenAralik: `${initialStart || 0}-${initialEnd || 0}`,
        yuklenenKayitSayisi: (initialEnd || 0) - (initialStart || 0),
      });
      
      const initialData = await loadDataRange(initialStart, initialEnd, statsKeys);
      
      let totalSittingTime = 0;
      let alarmCount = 0;
      let snoozeCount = 0;
      
      const BATCH_SIZE = 1000;
      for (let i = 0; i < statsKeys.length; i += BATCH_SIZE) {
        const chunk = statsKeys.slice(i, i + BATCH_SIZE);
        const savedData = await AsyncStorage.multiGet(chunk);
        
        savedData.forEach(([key, value]) => {
          if (value) {
            const dayStats = JSON.parse(value);
            totalSittingTime += dayStats.totalSittingTime || 0;
            alarmCount += dayStats.alarmCount || 0;
            snoozeCount += dayStats.snoozeCount || 0;
          }
        });
      }
      
      if (totalSittingTime === 0 && initialData.length > 0) {
        totalSittingTime = initialData.reduce((sum, d) => sum + (d.totalTime || 0), 0);
        alarmCount = initialData.reduce((sum, d) => sum + (d.sessions?.length || 0), 0);
        snoozeCount = initialData.reduce((sum, d) => sum + (d.sessions?.reduce((s, sess) => s + (sess.snoozes || 0), 0) || 0), 0);
      }
      
      setLoadedDataRange({ start: initialStart, end: initialEnd });
      setAllTimeStats({
        totalSittingTime,
        alarmCount,
        snoozeCount,
        dailyData: initialData,
      });
      setIsLoadingChart(false);
      isInitialLoad.current = true;
    } catch (error) {
      console.error('Tüm zamanlar istatistikleri yüklenemedi:', error);
      setAllTimeStats({
        totalSittingTime: 0,
        alarmCount: 0,
        snoozeCount: 0,
        dailyData: [],
      });
      setIsLoadingChart(false);
    }
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollOffsetX.current = offsetX;
    
    if (selectedDayInfo) {
      setSelectedDayInfo(null);
    }
    
    // İlk yükleme sırasında lazy loading'i engelle
    if (isInitialLoad.current) {
      return;
    }
    
    const scrollThreshold = 50;
    const currentStart = loadedDataRange.start;
    
    if (offsetX <= scrollThreshold && currentStart > 0 && !isLoadingMore) {
      console.log('🔄 Lazy loading tetiklendi (en sola geldi):', {
        scrollOffset: offsetX || 0,
        mevcutAralik: `${currentStart || 0}-${loadedDataRange?.end || 0}`,
        yuklenecekAralik: `${Math.max(0, (currentStart || 0) - 30)}-${currentStart || 0}`,
      });
      
      setIsLoadingMore(true);
      const newStart = Math.max(0, currentStart - 30);
      const newEnd = currentStart;
      
      loadDataRange(newStart, newEnd, allStatsKeys).then((newData) => {
        console.log('✅ Lazy loading tamamlandı:', {
          yuklenenKayitSayisi: newData?.length || 0,
          yeniAralik: `${newStart || 0}-${loadedDataRange?.end || 0}`,
          toplamKayit: (newData?.length || 0) + (allTimeStats?.dailyData?.length || 0),
        });
        
        if (newData.length > 0) {
          setAllTimeStats(prev => ({
            ...prev,
            dailyData: [...newData, ...prev.dailyData],
          }));
          setLoadedDataRange({ start: newStart, end: loadedDataRange.end });
          
          setTimeout(() => {
            if (lineChartScrollRef.current) {
              const newScrollOffset = offsetX + (newData.length * 18);
              lineChartScrollRef.current.scrollTo({
                x: Math.max(0, newScrollOffset),
                animated: false,
              });
              scrollOffsetX.current = newScrollOffset;
            }
          }, 150);
        }
        setIsLoadingMore(false);
      }).catch((error) => {
        console.error('❌ Daha fazla veri yüklenemedi:', error);
        setIsLoadingMore(false);
      });
    }
  };

  // Veriler yüklenene kadar hiçbir şey gösterme (flash önleme)
  if (isLoadingChart || allTimeStats === null) {
    return null;
  }

  return (
    <>
      {/* Tüm Zamanlar Özeti */}
      <View style={styles.todayStatCard}>
        <View style={styles.todayStatContent}>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>⏱️</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(formatCountdown(Math.floor((allTimeStats?.totalSittingTime || 0) * 60), t) || `0 ${t('timer.secondsShort')}`) || `0 ${t('timer.secondsShort')}`}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.sittingTime')}</Text>
            </View>
          </View>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>🔔</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(allTimeStats?.alarmCount || 0)}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.alarmSet')}</Text>
            </View>
          </View>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatEmoji}>⏰</Text>
            <View style={styles.todayStatTextContainer}>
              <Text style={styles.todayStatValue}>
                {String(allTimeStats?.snoozeCount || 0)}
              </Text>
              <Text style={styles.todayStatLabel}>{t('statistics.alarmSnoozed')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* İlk Kayıt Tarihi Bilgisi */}
      {allStatsKeys && allStatsKeys.length > 0 && (() => {
        const firstKey = allStatsKeys[0];
        const firstDateStr = firstKey.replace('dailyStats_', '');
        const firstDate = new Date(firstDateStr + 'T00:00:00');
        const dayNames = [
          t('statistics.dayNames.sunday'),
          t('statistics.dayNames.monday'),
          t('statistics.dayNames.tuesday'),
          t('statistics.dayNames.wednesday'),
          t('statistics.dayNames.thursday'),
          t('statistics.dayNames.friday'),
          t('statistics.dayNames.saturday')
        ];
        const dayName = dayNames[firstDate.getDay()];
        // Tarih formatını dil'e göre ayarla
        const locale = t('statistics.dayNames.sunday') === 'Sunday' ? 'en-US' : 'tr-TR';
        const formattedDate = new Date(firstDateStr + 'T00:00:00').toLocaleDateString(locale, { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        return (
          <View style={styles.firstRecordInfo}>
            <Text style={styles.firstRecordText}>
              {formattedDate} {dayName} {t('statistics.since')}
            </Text>
          </View>
        );
      })()}

      {/* Line Chart */}
      {isLoadingChart ? (
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{t('statistics.sittingTimeTitle')}</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>{t('statistics.loadingChart')}</Text>
          </View>
        </View>
      ) : allTimeStats?.dailyData && allTimeStats.dailyData.length > 0 ? (
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>{t('statistics.sittingTimeTitle')}</Text>
          <View style={styles.chartInfo}>
            <Text style={styles.chartInfoText}>{t('statistics.chartHint')}</Text>
          </View>
          <View style={styles.lineChartWrapper}>
            <View style={styles.lineChartYAxis}>
              {[0, 1, 2, 3, 4].map((i) => {
                let maxTime = 1;
                if (allTimeStats?.dailyData && allTimeStats.dailyData.length > 0) {
                  const timeValues = allTimeStats.dailyData.map(d => d.totalTime || 0).filter(v => !isNaN(v) && v > 0);
                  maxTime = timeValues.length > 0 ? Math.max(...timeValues, 1) : 1;
                }
                const value = Math.floor((maxTime / 4) * (4 - i));
                return (
                  <Text key={i} style={styles.lineChartYLabel}>
                    {String(value) + t('timer.minutesShort')}
                  </Text>
                );
              })}
            </View>
            
            <View style={styles.chartContainer}>
              {isLoadingMore && (
                <View style={styles.lazyLoadingIndicator}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.lazyLoadingText}>{t('statistics.loadingMore')}</Text>
                </View>
              )}
              <ScrollView
                ref={lineChartScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.lineChartAreaScrollContent}
                style={styles.lineChartAreaScroll}
                onScroll={handleScroll}
                scrollEventThrottle={200}
                onLayout={() => {
                  // Grafik render olduğu anda scroll pozisyonunu ayarla
                  if (isInitialLoad.current && allTimeStats?.dailyData && allTimeStats.dailyData.length > 0) {
                    requestAnimationFrame(() => {
                      if (lineChartScrollRef.current) {
                        const dataCount = allTimeStats.dailyData.length;
                        const minPadding = 20;
                        const rightPadding = 20; // Sağ tarafta da padding
                        // Padding'i hesaba katarak grafik genişliğini hesapla
                        const chartWidth = dataCount === 1 ? Math.max(minPadding, (width - 90) / 2 - 5) + rightPadding : (minPadding + dataCount * 18 + rightPadding);
                        const visibleWidth = width - 90;
                        const scrollableWidth = Math.max(0, chartWidth - visibleWidth + 30);
                        
                        if (scrollableWidth > 0) {
                          lineChartScrollRef.current.scrollTo({
                            x: scrollableWidth,
                            animated: false,
                          });
                          scrollOffsetX.current = scrollableWidth;
                        }
                        isInitialLoad.current = false;
                      }
                    });
                  }
                }}
              >
                <ScrollView
                  vertical
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.lineChartVerticalScrollContent}
                  style={styles.lineChartVerticalScroll}
                >
                  <View 
                    style={[
                      styles.lineChartArea, 
                      { 
                        width: (() => {
                          const dataCount = allTimeStats?.dailyData?.length || 0;
                          const minPadding = 20;
                          const rightPadding = 20; // Sağ tarafta da padding
                          if (dataCount === 0) return width - 90;
                          if (dataCount === 1) {
                            return Math.max(minPadding, (width - 90) / 2 - 5) + rightPadding; // Ortada + sağ padding
                          }
                          return Math.max(minPadding + dataCount * 18 + rightPadding, width - 90);
                        })(),
                        minHeight: 200,
                        paddingTop: 20,
                        paddingBottom: 20,
                      }
                    ]}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.lineChartGridLine,
                          { top: (i * 200) / 4 + 20 },
                        ]}
                      />
                    ))}
                    
                    {(() => {
                      if (!allTimeStats?.dailyData || allTimeStats.dailyData.length === 0) return null;
                      const timeValues = allTimeStats.dailyData.map(d => d.totalTime || 0).filter(v => !isNaN(v) && v > 0);
                      const maxTime = timeValues.length > 0 ? Math.max(...timeValues, 1) : 1;
                      const dataLength = allTimeStats.dailyData.length;
                      // Tek kayıt olduğunda noktayı ortaya al, birden fazla kayıt varsa normal hesapla
                      // En soldaki noktanın kesilmemesi için minimum 20px padding ekle
                      const minPadding = 20;
                      const basePointX = dataLength === 1 ? Math.max(minPadding, (width - 90) / 2 - 5) : minPadding;
                      return allTimeStats.dailyData.map((day, index) => {
                        if (!day || !day.date) return null;
                        const pointHeight = ((day.totalTime || 0) / maxTime) * 200;
                        const pointY = 200 - Math.max(pointHeight, 5) + 20;
                        const pointX = dataLength === 1 ? basePointX : (basePointX + index * 18);
                        const isSelected = selectedDayInfo && selectedDayInfo.index === index;
                        
                        return (
                          <React.Fragment key={index}>
                            <TouchableOpacity
                              style={[styles.lineChartPoint, { left: pointX, top: pointY }]}
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedDayInfo(null);
                                setTimeout(() => {
                                  setSelectedDayInfo({
                                    date: day.date,
                                    totalTime: day.totalTime || 0,
                                    x: pointX,
                                    y: pointY,
                                    index: index,
                                  });
                                }, 10);
                              }}
                              activeOpacity={0.7}
                              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            >
                              <View style={[styles.lineChartPointDot, isSelected && styles.lineChartPointDotSelected]} />
                              {index % 30 === 0 && (() => {
                                const locale = t('statistics.dayNames.sunday') === 'Sunday' ? 'en-US' : 'tr-TR';
                                return (
                                  <Text style={styles.lineChartDateLabel}>
                                    {String(new Date(day.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) || '')}
                                  </Text>
                                );
                              })()}
                            </TouchableOpacity>
                          </React.Fragment>
                        );
                      });
                    })()}
                    
                    {(() => {
                      if (!allTimeStats?.dailyData || allTimeStats.dailyData.length === 0) return null;
                      const timeValues = allTimeStats.dailyData.map(d => d.totalTime || 0).filter(v => !isNaN(v) && v > 0);
                      const maxTime = timeValues.length > 0 ? Math.max(...timeValues, 1) : 1;
                      const dataLength = allTimeStats.dailyData.length;
                      // En soldaki noktanın kesilmemesi için minimum 20px padding ekle
                      const minPadding = 20;
                      const basePointX = dataLength === 1 ? Math.max(minPadding, (width - 90) / 2 - 5) : minPadding;
                      return allTimeStats.dailyData.map((day, index) => {
                        if (index === 0) return null;
                        if (!day || !day.date) return null;
                        const prevDay = allTimeStats.dailyData[index - 1];
                        if (!prevDay || !prevDay.date) return null;
                        const prevHeight = ((prevDay.totalTime || 0) / maxTime) * 200;
                        const currHeight = ((day.totalTime || 0) / maxTime) * 200;
                        const prevY = 200 - Math.max(prevHeight, 5) + 20;
                        const currY = 200 - Math.max(currHeight, 5) + 20;
                        const prevX = dataLength === 1 ? basePointX : (basePointX + (index - 1) * 18);
                        const currX = dataLength === 1 ? basePointX : (basePointX + index * 18);
                      
                        const length = Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2));
                        const angle = Math.atan2(currY - prevY, currX - prevX) * (180 / Math.PI);
                      
                        return (
                          <View
                            key={`line-${index}`}
                            style={[
                              styles.lineChartLine,
                              {
                                left: prevX + 4,
                                top: prevY + 4,
                                width: length,
                                transform: [{ rotate: String(angle) + 'deg' }],
                              },
                            ]}
                          />
                        );
                      });
                    })()}
                  </View>
                </ScrollView>
              </ScrollView>
              
              {/* Tooltip */}
              {selectedDayInfo && allTimeStats?.dailyData && allTimeStats.dailyData.length > 0 && selectedDayInfo.index >= 0 && selectedDayInfo.index < allTimeStats.dailyData.length && (() => {
                const day = allTimeStats.dailyData[selectedDayInfo.index];
                if (!day || !day.date) {
                  return null;
                }
                
                const timeValues = allTimeStats.dailyData.map(d => d.totalTime || 0).filter(v => !isNaN(v) && v > 0);
                const maxTime = timeValues.length > 0 ? Math.max(...timeValues, 1) : 1;
                const chartHeight = 200;
                const pointHeight = ((day.totalTime || 0) / maxTime) * chartHeight;
                const pointY = chartHeight - Math.max(pointHeight, 5) + 20;
                // Tek kayıt olduğunda noktayı ortaya al, birden fazla kayıt varsa normal hesapla
                // En soldaki noktanın kesilmemesi için minimum 20px padding ekle
                const dataLength = allTimeStats.dailyData.length;
                const minPadding = 20;
                const basePointX = dataLength === 1 ? Math.max(minPadding, (width - 90) / 2 - 5) : minPadding;
                const pointX = dataLength === 1 ? basePointX : (basePointX + selectedDayInfo.index * 18);
                
                const scrollOffset = scrollOffsetX.current || 0;
                const tooltipWidth = 140;
                const tooltipLeft = 50 + Math.max(10, pointX - scrollOffset - tooltipWidth - 10);
                const tooltipTop = Math.max(10, pointY - 40);
                
                return (
                  <View 
                    key={`tooltip-${selectedDayInfo.index}-${day.date}`}
                    style={[
                      styles.lineChartTooltip, 
                      { 
                        left: tooltipLeft,
                        top: tooltipTop,
                      }
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={styles.lineChartTooltipDay}>
                      {(() => {
                        const locale = t('statistics.dayNames.sunday') === 'Sunday' ? 'en-US' : 'tr-TR';
                        return String(new Date(day.date).toLocaleDateString(locale, { weekday: 'long' }) || '');
                      })()}
                    </Text>
                    <Text style={styles.lineChartTooltipDate}>
                      {(() => {
                        const locale = t('statistics.dayNames.sunday') === 'Sunday' ? 'en-US' : 'tr-TR';
                        return String(new Date(day.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) || '');
                      })()}
                    </Text>
                    <View style={styles.tooltipDivider} />
                    <View style={styles.tooltipStatsRow}>
                      <View style={styles.tooltipStatItem}>
                        <Text style={styles.tooltipStatLabel}>{t('statistics.duration')}</Text>
                        <Text style={styles.lineChartTooltipTime}>
                          {(() => {
                            const totalMinutes = Math.floor((day.totalTime || 0));
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            if (hours > 0) {
                              return String(`${hours}${t('timer.hoursShort')} ${minutes}${t('timer.minutesShort')}`);
                            }
                            return String(`${minutes}${t('timer.minutesShort')}`);
                          })()}
                        </Text>
                      </View>
                      {day.sessions && day.sessions.length > 0 && (
                        <View style={styles.tooltipStatItem}>
                          <Text style={styles.tooltipStatLabel}>{t('statistics.sessions')}</Text>
                          <Text style={styles.lineChartTooltipSessions}>
                            {String(day.sessions.length || 0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>
      ) : null}
      
      {selectedDayInfo && (
        <TouchableOpacity
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedDayInfo(null);
          }}
        />
      )}
    </>
  );
};

const getStyles = () => {
  const screenWidth = Dimensions.get('window').width;
  return StyleSheet.create({
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
    firstRecordInfo: {
      backgroundColor: '#E3F2FD',
      borderRadius: 12,
      padding: 12,
      marginBottom: 15,
      alignItems: 'center',
    },
    firstRecordText: {
      fontSize: 14,
      color: '#2196F3',
      fontWeight: '600',
      textAlign: 'center',
    },
    statCard: {
      backgroundColor: '#fff',
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statCardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      flex: 1,
    },
    chartInfo: {
      backgroundColor: '#E3F2FD',
      borderRadius: 8,
      padding: 10,
      marginBottom: 15,
    },
    chartInfoText: {
      fontSize: 12,
      color: '#2196F3',
      textAlign: 'center',
      fontWeight: '500',
    },
    lineChartWrapper: {
      flexDirection: 'row',
      marginTop: 20,
      height: 250,
      position: 'relative',
    },
    chartContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'visible',
    },
    lineChartYAxis: {
      width: 50,
      height: 200,
      justifyContent: 'space-between',
      paddingRight: 10,
      alignItems: 'flex-end',
    },
    lineChartYLabel: {
      fontSize: 11,
      color: '#999',
    },
    lineChartAreaScroll: {
      flex: 1,
      height: 200,
    },
    lineChartAreaScrollContent: {
      minWidth: screenWidth - 90,
      height: 200,
      paddingRight: 10,
    },
    lineChartVerticalScroll: {
      flex: 1,
    },
    lineChartVerticalScrollContent: {
      minHeight: 200,
    },
    lineChartArea: {
      minWidth: screenWidth - 90,
      minHeight: 200,
      position: 'relative',
      borderLeftWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#e0e0e0',
    },
    lineChartGridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: '#f0f0f0',
    },
    lineChartPoint: {
      position: 'absolute',
      width: 10,
      height: 10,
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginLeft: -5,
      marginTop: -5,
    },
    lineChartPointDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    lineChartPointDotSelected: {
      backgroundColor: '#2E7D32',
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    lineChartTooltip: {
      position: 'absolute',
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 10,
      minWidth: 120,
      maxWidth: 140,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 20,
      zIndex: 9999,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    lineChartTooltipDay: {
      color: '#666',
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 2,
      textTransform: 'capitalize',
    },
    lineChartTooltipDate: {
      color: '#333',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
      textTransform: 'capitalize',
    },
    tooltipDivider: {
      height: 1,
      backgroundColor: '#e0e0e0',
      marginVertical: 6,
    },
    tooltipStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 4,
    },
    tooltipStatItem: {
      alignItems: 'center',
      flex: 1,
    },
    tooltipStatLabel: {
      color: '#999',
      fontSize: 10,
      fontWeight: '500',
      marginBottom: 4,
    },
    lineChartTooltipTime: {
      color: '#4CAF50',
      fontSize: 14,
      fontWeight: 'bold',
    },
    lineChartTooltipSessions: {
      color: '#4CAF50',
      fontSize: 14,
      fontWeight: 'bold',
    },
    lineChartLine: {
      position: 'absolute',
      height: 3,
      backgroundColor: '#4CAF50',
      opacity: 0.4,
      transformOrigin: 'left center',
      borderRadius: 1.5,
    },
    lineChartDateLabel: {
      fontSize: 9,
      color: '#999',
      marginTop: 10,
      textAlign: 'center',
      width: 45,
      marginLeft: -18.5,
    },
    tooltipOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#666',
      fontWeight: '500',
    },
    lazyLoadingIndicator: {
      position: 'absolute',
      top: 10,
      alignSelf: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    lazyLoadingText: {
      marginLeft: 8,
      fontSize: 12,
      color: '#4CAF50',
      fontWeight: '600',
    },
  });
};

const styles = getStyles();

export default AllTimeStatistics;

