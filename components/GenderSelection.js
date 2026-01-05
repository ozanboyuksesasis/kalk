import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const GenderSelection = ({ onSelect }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('gender.title')}</Text>
      <Text style={styles.subtitle}>{t('gender.subtitle')}</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => onSelect('male')}
        >
          <Text style={styles.emoji}>🚶</Text>
          <Text style={styles.label}>{t('gender.male')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.option}
          onPress={() => onSelect('female')}
        >
          <Text style={styles.emoji}>🚶‍♀️</Text>
          <Text style={styles.label}>{t('gender.female')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 30,
  },
  option: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default GenderSelection;

