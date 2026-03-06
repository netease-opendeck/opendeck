import { createI18n } from 'vue-i18n';
import zh from './locales/zh';
import en from './locales/en';

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;
const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
const initialLocale =
  saved === 'zh' || saved === 'en'
    ? saved
    : browserLang.startsWith('zh')
      ? 'zh'
      : 'en';

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
  },
});

export function setLocale(locale: 'zh' | 'en') {
  i18n.global.locale.value = locale;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', locale);
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }
}
