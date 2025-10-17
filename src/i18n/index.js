import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCN from '../locales/zh-CN.json'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'

const LS_LANG_KEY = 'rw_lang'
const fallbackLng = 'zh-CN'
const saved = (() => { try { return localStorage.getItem(LS_LANG_KEY) || fallbackLng } catch { return fallbackLng } })()

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
      'zh-TW': { translation: zhTW },
    },
    lng: saved,
    fallbackLng,
    interpolation: { escapeValue: false },
  })

export function setAppLanguage(lng) {
  i18n.changeLanguage(lng)
  try { localStorage.setItem(LS_LANG_KEY, lng) } catch {}
}

export function getAppLanguage() {
  return i18n.language || fallbackLng
}

export default i18n

