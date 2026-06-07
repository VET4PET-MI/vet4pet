import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import he from './he.json'
import en from './en.json'

const RTL_LANGS = ['he', 'ar']

function applyDirection(lang) {
  // lang may include a region subtag (e.g. 'he-IL' from a phone's navigator),
  // so match on the base language, consistent with the startsWith('he') checks
  // used elsewhere in the app.
  const dir = RTL_LANGS.some((l) => lang?.startsWith(l)) ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  document.documentElement.dir  = dir
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    fallbackLng: 'he',
    supportedLngs: ['he', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'v4p_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })
  .then(() => applyDirection(i18n.language))

i18n.on('languageChanged', applyDirection)

export default i18n
