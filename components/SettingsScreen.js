import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';

const SettingsScreen = ({
  snoozeDuration: initialSnoozeDuration,
  maxSnoozes: initialMaxSnoozes,
  notificationStatus,
  enableVibration: initialEnableVibration,
  enableSound: initialEnableSound,
  alarmSound: initialAlarmSound,
  availableAlarmSounds, // Dinamik alarm sesleri listesi
  onBack,
  onSave,
  onNotificationToggle,
  onTestSound,
  onClearData,
}) => {
  // Local state - sadece bu ekranda kullanılacak, kaydet butonuna basıldığında parent'a gönderilecek
  const [snoozeDuration, setSnoozeDuration] = useState(initialSnoozeDuration);
  const [maxSnoozes, setMaxSnoozes] = useState(initialMaxSnoozes);
  const [enableVibration, setEnableVibration] = useState(initialEnableVibration);
  const [enableSound, setEnableSound] = useState(initialEnableSound);
  const [alarmSound, setAlarmSound] = useState(initialAlarmSound);
  
  // Props değiştiğinde local state'i güncelle (ekran yeniden açıldığında)
  useEffect(() => {
    setSnoozeDuration(initialSnoozeDuration);
    setMaxSnoozes(initialMaxSnoozes);
    setEnableVibration(initialEnableVibration);
    setEnableSound(initialEnableSound);
    setAlarmSound(initialAlarmSound);
  }, [initialSnoozeDuration, initialMaxSnoozes, initialEnableVibration, initialEnableSound, initialAlarmSound]);
  
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  
  // Kaydet butonuna basıldığında tüm değişiklikleri parent'a gönder
  const handleSave = () => {
    if (onSave) {
      onSave({
        snoozeDuration,
        maxSnoozes,
        enableVibration,
        enableSound,
        alarmSound,
      });
    }
  };
  
  // Alarm sesi seçenekleri - dinamik olarak availableAlarmSounds'tan al
  const alarmSounds = availableAlarmSounds ? availableAlarmSounds.map(sound => ({
    value: sound.id,
    label: sound.label,
  })) : [
    { value: 'alarm1', label: 'Alarm 1' },
    { value: 'alarm2', label: 'Alarm 2' },
    { value: 'alarm3', label: 'Alarm 3' },
  ];
  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      bounces={false}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={onBack}
          >
            <Text style={styles.backButtonSmallText}>◀ Geri</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Ayarlar</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>✓ Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Erteleme Süresi (dakika)</Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setSnoozeDuration(Math.max(1, snoozeDuration - 5))}
            >
              <Text style={styles.settingButtonText}>-5</Text>
            </TouchableOpacity>
            <Text style={styles.settingValue}>{String(snoozeDuration || 0)} dk</Text>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setSnoozeDuration(Math.min(30, snoozeDuration + 5))}
            >
              <Text style={styles.settingButtonText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Maksimum Erteleme Sayısı</Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setMaxSnoozes(Math.max(1, maxSnoozes - 1))}
            >
              <Text style={styles.settingButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.settingValue}>{String(maxSnoozes || 0)} kez</Text>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setMaxSnoozes(Math.min(10, maxSnoozes + 1))}
            >
              <Text style={styles.settingButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* İzinler listesi */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>İzinler</Text>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionName}>Bildirim izni</Text>
            <View style={styles.permissionRight}>
              <Text
                style={
                  notificationStatus === 'granted'
                    ? styles.permissionStatusGranted
                    : styles.permissionStatusDenied
                }
              >
                {notificationStatus === 'granted' ? 'Açık' : 'Kapalı'}
              </Text>
              <Switch
                value={notificationStatus === 'granted'}
                onValueChange={onNotificationToggle}
              />
            </View>
          </View>
        </View>

        {/* Alarm Ayarları */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Alarm Ayarları</Text>
          
          {/* Titreşim */}
          <View style={styles.permissionRow}>
            <Text style={styles.permissionName}>📳 Titreşim</Text>
            <Switch
              value={enableVibration}
              onValueChange={setEnableVibration}
            />
          </View>
          
          {/* Ses */}
          <View style={[styles.permissionRow, { marginTop: 15 }]}>
            <Text style={styles.permissionName}>🔊 Ses</Text>
            <Switch
              value={enableSound}
              onValueChange={setEnableSound}
            />
          </View>
          
          {/* Alarm Sesi Seçimi */}
          {enableSound && (
            <View style={styles.soundPickerContainer}>
              <Text style={styles.soundPickerLabel}>Alarm Sesi:</Text>
              <View style={styles.soundPickerButtons}>
                {alarmSounds.map((sound) => (
                  <TouchableOpacity
                    key={sound.value}
                    style={[
                      styles.soundPickerButton,
                      alarmSound === sound.value && styles.soundPickerButtonActive,
                    ]}
                    onPress={() => {
                      setAlarmSound(sound.value);
                      // Ses seçildiğinde test sesi çal
                      if (enableSound && onTestSound) {
                        onTestSound(sound.value);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.soundPickerButtonText,
                        alarmSound === sound.value && styles.soundPickerButtonTextActive,
                      ]}
                    >
                      {sound.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Verileri Temizle Butonu */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Veri Yönetimi</Text>
          <TouchableOpacity
            style={styles.clearDataButton}
            onPress={onClearData}
          >
            <Text style={styles.clearDataButtonText}>🗑️ Verileri Temizle</Text>
          </TouchableOpacity>
          <Text style={styles.clearDataDescription}>
            Tüm istatistik verileri ve timer durumları silinir
          </Text>
        </View>
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
  settingsContainer: {
    padding: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButtonSmall: {
    padding: 8,
  },
  backButtonSmallText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  settingItem: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  settingButton: {
    backgroundColor: '#4CAF50',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionName: {
    fontSize: 16,
    color: '#333',
  },
  permissionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionStatusGranted: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  permissionStatusDenied: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: '600',
  },
  clearDataButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  clearDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearDataDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  soundPickerContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  soundPickerLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  soundPickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  soundPickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 100,
  },
  soundPickerButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  soundPickerButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  soundPickerButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SettingsScreen;

