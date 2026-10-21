'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationDictionary, translations } from '@/lib/i18n/translations';
import { updateUserLanguage, getUserLanguage } from '@/actions/user-actions';

interface LanguageContextType {
  language: Language;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // 1. Check local storage first for instant load
    const stored = localStorage.getItem('proxima_language') as Language;
    if (stored === 'ar' || stored === 'en') {
      applyLanguage(stored);
    }

    // 2. Sync with user DB preference
    getUserLanguage().then((dbLang) => {
      if (dbLang && (dbLang === 'ar' || dbLang === 'en')) {
        applyLanguage(dbLang);
      }
    }).catch(() => {});
  }, []);

  const applyLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('proxima_language', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      if (lang === 'ar') {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    }
  };

  const setLanguage = async (newLang: Language) => {
    applyLanguage(newLang);
    try {
      await updateUserLanguage(newLang);
    } catch (e) {
      console.warn('Failed to persist language in DB', e);
    }
  };

  const t = (key: keyof TranslationDictionary, fallback?: string): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction: language === 'ar' ? 'rtl' : 'ltr',
        isRtl: language === 'ar',
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
