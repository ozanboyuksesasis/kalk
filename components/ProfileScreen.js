import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

const ProfileScreen = ({
  gender: initialGender,
  onBack,
  onGenderChange,
}) => {
  const [gender, setGender] = useState(initialGender);
  const { t } = useTranslation();

  // Props değiştiğinde local state'i güncelle
  useEffect(() => {
    setGender(initialGender);
  }, [initialGender]);

  const handleGenderSelect = (selectedGender) => {
    setGender(selectedGender);
    if (onGenderChange) {
      onGenderChange(selectedGender);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.title')}</Text>
        
        <View style={styles.genderContainer}>
          <Text style={styles.label}>{t('profile.gender')}</Text>
          <Text style={styles.subLabel}>{t('gender.subtitle')}</Text>
          
          <View style={styles.genderOptions}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                gender === 'male' && styles.genderOptionSelected,
              ]}
              onPress={() => handleGenderSelect('male')}
            >
              <Text style={styles.genderEmoji}>🚶</Text>
              <Text style={[
                styles.genderLabel,
                gender === 'male' && styles.genderLabelSelected,
              ]}>
                {t('profile.male')}
              </Text>
              {gender === 'male' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.genderOption,
                gender === 'female' && styles.genderOptionSelected,
              ]}
              onPress={() => handleGenderSelect('female')}
            >
              <Text style={styles.genderEmoji}>🚶‍♀️</Text>
              <Text style={[
                styles.genderLabel,
                gender === 'female' && styles.genderLabelSelected,
              ]}>
                {t('profile.female')}
              </Text>
              {gender === 'female' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 60,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  genderContainer: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 15,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  genderOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  genderEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  genderLabelSelected: {
    color: '#4CAF50',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;

