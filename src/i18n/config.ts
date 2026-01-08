import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

export const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', altFlag: '🇨🇮' },
  { code: 'en', name: 'English', flag: '🇬🇧', altFlag: '🇬🇧' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', altFlag: '🇬🇼' }] as const;

export type LanguageCode = typeof languages[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      pt: { translation: pt },
    },
    fallbackLng: 'fr',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  });

export default i18n;
