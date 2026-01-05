import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import tr from './tr.json';
import en from './en.json';

// Telefon dilini al, Türkçe ise 'tr', aksi halde 'en'
const getDeviceLanguage = () => {
  try {
    // Önce getLocales() ile dene (daha güvenilir)
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const locale = locales[0];
      const languageCode = locale.languageCode || locale.languageTag?.split('-')[0] || 'en';
      if (languageCode.toLowerCase() === 'tr') {
        return 'tr';
      }
    }
    
    // Fallback: locale property'sini kullan
    const locale = Localization.locale || 'en';
    const languageCode = locale.split('-')[0].toLowerCase();
    
    // Türkçe ise 'tr', aksi halde 'en'
    if (languageCode === 'tr') {
      return 'tr';
    }
  } catch (error) {
    console.error('Dil algılama hatası:', error);
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      tr: {
        translation: tr,
      },
      en: {
        translation: en,
      },
    },
    lng: getDeviceLanguage(), // Telefon diline göre otomatik seçim
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React zaten escape ediyor
    },
  });

export default i18n;

