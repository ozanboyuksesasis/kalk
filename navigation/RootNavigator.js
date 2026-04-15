import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppContext } from '../context/AppContext';

import Header from '../components/Header';
import Menu from '../components/Menu';
import TimerScreen from '../components/TimerScreen';
import SettingsScreen from '../components/SettingsScreen';
import StatisticsScreen from '../components/StatisticsScreen';
import ProfileScreen from '../components/ProfileScreen';
import AlarmScreen from '../components/AlarmScreen';
import GenderSelection from '../components/GenderSelection';

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────────
// Timer (Ana Ekran)
// ─────────────────────────────────────────────
function TimerScreenWrapper({ navigation }) {
  const ctx = useAppContext();
  const [showMenu, setShowMenu] = useState(false);

  // İlk yükleme tamamlanınca cinsiyet yoksa GenderSelection'a yönlendir
  useEffect(() => {
    if (!ctx.isLoading && ctx.gender === null) {
      navigation.navigate('GenderSelection');
    }
  }, [ctx.isLoading, ctx.gender]);

  return (
    <View style={styles.screen}>
      <Header onMenuPress={() => setShowMenu(true)} />
      <Menu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onStatisticsPress={() => { setShowMenu(false); navigation.navigate('Statistics'); }}
        onProfilePress={() => { setShowMenu(false); navigation.navigate('Profile'); }}
        onSettingsPress={() => { setShowMenu(false); navigation.navigate('Settings'); }}
      />
      <TimerScreen
        duration={ctx.duration}
        timeLeft={ctx.timeLeft}
        isRunning={ctx.isRunning}
        isAlarm={ctx.isAlarm}
        initialDuration={ctx.initialDuration}
        displayTime={ctx.displayTime}
        animatedStyle={ctx.animatedStyle}
        healthInfo={ctx.healthInfo}
        gender={ctx.gender}
        onIncrease={ctx.handleIncrease}
        onDecrease={ctx.handleDecrease}
        onDialRotate={ctx.handleDialRotate}
        onStart={ctx.startTimer}
        onStop={ctx.stopTimer}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
function SettingsWrapper({ navigation }) {
  const ctx = useAppContext();
  return (
    <SettingsScreen
      snoozeDuration={ctx.snoozeDuration}
      maxSnoozes={ctx.maxSnoozes}
      notificationStatus={ctx.notificationStatus}
      enableVibration={ctx.enableVibration}
      enableSound={ctx.enableSound}
      alarmSound={ctx.alarmSound}
      availableAlarmSounds={ctx.availableAlarmSounds}
      onBack={async () => {
        await ctx.stopAlarmSound();
        navigation.goBack();
      }}
      onSave={async (settings) => {
        await ctx.handleSettingsSave(settings);
      }}
      onNotificationToggle={async (value) => {
        if (value) {
          await ctx.requestNotificationPermissionsAgain();
        } else {
          ctx.openSystemSettings();
        }
      }}
      onTestSound={ctx.playTestSound}
      onClearData={ctx.clearAllData}
    />
  );
}

// ─────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────
function StatisticsWrapper({ navigation }) {
  const ctx = useAppContext();
  const [statisticsView, setStatisticsView] = useState('today');

  return (
    <StatisticsScreen
      onBack={() => {
        setStatisticsView('today');
        navigation.goBack();
      }}
      refreshKey={ctx.statisticsRefreshKey}
      statisticsView={statisticsView}
      setStatisticsView={setStatisticsView}
    />
  );
}

// ─────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────
function ProfileWrapper({ navigation }) {
  const ctx = useAppContext();
  return (
    <ProfileScreen
      gender={ctx.gender}
      onBack={() => navigation.goBack()}
      onGenderChange={ctx.handleGenderChange}
    />
  );
}

// ─────────────────────────────────────────────
// Alarm
// ─────────────────────────────────────────────
function AlarmWrapper() {
  const ctx = useAppContext();
  return (
    <AlarmScreen
      totalSittingDuration={ctx.totalSittingDuration}
      snoozeCount={ctx.snoozeCount}
      maxSnoozes={ctx.maxSnoozes}
      snoozeDuration={ctx.snoozeDuration}
      onSnooze={ctx.handleSnooze}
      onStandUp={ctx.handleStandUp}
      stopAlarmSound={ctx.stopAlarmSound}
      intervalRef={ctx.intervalRef}
    />
  );
}

// ─────────────────────────────────────────────
// GenderSelection
// ─────────────────────────────────────────────
function GenderSelectionWrapper({ navigation }) {
  const ctx = useAppContext();
  return (
    <GenderSelection
      onSelect={async (selectedGender) => {
        await ctx.handleGenderSelect(selectedGender);
        navigation.navigate('Timer');
      }}
    />
  );
}

// ─────────────────────────────────────────────
// Root Navigator
// ─────────────────────────────────────────────
export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Timer"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Timer"      component={TimerScreenWrapper} />
      <Stack.Screen name="Statistics" component={StatisticsWrapper} />
      <Stack.Screen name="Profile"    component={ProfileWrapper} />
      <Stack.Screen name="Settings"   component={SettingsWrapper} />
      <Stack.Screen
        name="Alarm"
        component={AlarmWrapper}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="GenderSelection"
        component={GenderSelectionWrapper}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
