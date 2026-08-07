import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../public/locales/en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: {
        translation: en,
      },
    },
    interpolation: {
      // React already escapes values — no need for i18next to do so
      escapeValue: false,
    },
  });

export default i18n;
