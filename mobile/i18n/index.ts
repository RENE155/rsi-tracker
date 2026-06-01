import { I18n } from 'i18n-js';
import { en } from './translations/en';

const translations = { en };

const i18n = new I18n(translations);

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

type LocaleInfo = {
  languageTag?: string;
  languageCode?: string;
};

const getDeviceLocales = (): LocaleInfo[] => {
  try {
    const Localization = require('expo-localization') as { getLocales?: () => LocaleInfo[] };
    if (Localization?.getLocales) {
      return Localization.getLocales();
    }
  } catch (error) {
    // ExpoLocalization native binaryje nėra; pereinama prie Intl arba numatytojo.
  }
  return [];
};

const getIntlLocale = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch (error) {
    return null;
  }
};

const resolveLocale = () => {
  const supportedLocales = Object.keys(translations);
  const deviceLocale = getDeviceLocales()[0];

  const tryMatch = (locale?: string | null) => {
    if (!locale) return null;
    const normalized = locale.replace('_', '-');
    if (supportedLocales.includes(normalized)) return normalized;
    const base = normalized.split('-')[0];
    if (supportedLocales.includes(base)) return base;
    return null;
  };

  const fromDevice = tryMatch(deviceLocale?.languageTag) || tryMatch(deviceLocale?.languageCode);
  if (fromDevice) return fromDevice;

  const fromIntl = tryMatch(getIntlLocale());
  if (fromIntl) return fromIntl;

  return i18n.defaultLocale;
};

i18n.locale = resolveLocale();

export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
export const setLocale = (locale: string) => {
  i18n.locale = locale;
};
export const getLocale = () => i18n.locale;
export const supportedLocales = Object.keys(translations);

export default i18n;
