import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

const Header = ({ onMenuPress }) => {
  const { t } = useTranslation();
  // StatusBar yüksekliğini hesapla
  const statusBarHeight = Platform.OS === 'ios' 
    ? Constants.statusBarHeight 
    : (StatusBar.currentHeight || 0);
  
  return (
    <View style={styles.header}>
      <View style={[
        styles.headerContent,
        {
          paddingTop: statusBarHeight + 2,
          paddingBottom: 12,
        }
      ]}>
        <View style={styles.leftIconContainer}>
          {/* Sol tarafta boş alan */}
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('app.name')}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2196F3', // Özgün kurumsal mavi - canlı ve profesyonel (Blue 500)
    width: '100%',
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  leftIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  menuButtonText: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 28,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default Header;

