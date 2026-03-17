"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLocale,
  languageStorageKey,
  Locale,
  localeToIntl,
  translations,
  TranslationKey,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  formatDateTime: (value: Date | string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = localStorage.getItem(languageStorageKey) as Locale | null;
    if (stored && stored in translations) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(languageStorageKey, nextLocale);
  };

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: TranslationKey) => {
      return translations[locale][key] || translations.en[key];
    };

    const formatDateTime = (value: Date | string) => {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleString(localeToIntl[locale]);
    };

    return { locale, setLocale, t, formatDateTime };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
