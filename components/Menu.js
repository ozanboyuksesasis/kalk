import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const Menu = ({ 
  visible, 
  onClose, 
  onStatisticsPress,
  onProfilePress,
  onSettingsPress 
}) => {
  const { t } = useTranslation();
  const slideAnim = React.useRef(new Animated.Value(width)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  // StatusBar yüksekliğini hesapla
  const statusBarHeight = Platform.OS === 'ios' 
    ? Constants.statusBarHeight 
    : (StatusBar.currentHeight || 0);

  return (
    <>
      <Animated.View
        style={[
          styles.menuOverlay,
          {
            opacity: overlayOpacity,
          }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.menuContainer,
          {
            paddingTop: statusBarHeight + 16,
            transform: [{ translateX: slideAnim }],
          }
        ]}
      >
        <View style={styles.menuHeader}>
          <View style={styles.menuTitleContainer}>
            <View style={styles.menuTitleAccent} />
            <Text style={styles.menuTitle}>{t('menu.title')}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onStatisticsPress();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuItemIconContainer, styles.menuItemIconStats]}>
              <Text style={styles.menuItemIcon}>📈</Text>
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>{t('menu.statistics')}</Text>
              <Text style={styles.menuItemSubtext}>{t('menu.statisticsSubtext')}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onProfilePress();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuItemIconContainer, styles.menuItemIconProfile]}>
              <Text style={styles.menuItemIcon}>👤</Text>
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>{t('menu.profile')}</Text>
              <Text style={styles.menuItemSubtext}>{t('menu.profileSubtext')}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onSettingsPress();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.menuItemIconContainer, styles.menuItemIconSettings]}>
              <Text style={styles.menuItemIcon}>⚙️</Text>
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>{t('menu.settings')}</Text>
              <Text style={styles.menuItemSubtext}>{t('menu.settingsSubtext')}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.menuFooter}>
          <Text style={styles.menuFooterText}>{t('menu.version')}</Text>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: '#fff',
    zIndex: 1000,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  menuTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuTitleAccent: {
    width: 4,
    height: 28,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  menuCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    width: 40,
    height: 40,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  menuCloseButtonText: {
    fontSize: 22,
    color: '#666',
    fontWeight: '600',
    includeFontPadding: false,
  },
  menuItems: {
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#fafafa',
    minHeight: 80,
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  menuItemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  menuItemIconStats: {
    backgroundColor: '#E8F5E9',
  },
  menuItemIconProfile: {
    backgroundColor: '#FFF3E0',
  },
  menuItemIconSettings: {
    backgroundColor: '#E3F2FD',
  },
  menuItemIcon: {
    fontSize: 28,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 4,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#888',
    fontWeight: '400',
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  menuItemArrow: {
    fontSize: 28,
    color: '#4CAF50',
    fontWeight: '300',
    marginLeft: 8,
  },
  menuFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  menuFooterText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default Menu;

