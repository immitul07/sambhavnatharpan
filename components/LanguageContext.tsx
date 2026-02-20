import type { LangKey } from '@/constants/i18n';
import { t as translate } from '@/constants/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type LanguageContextType = {
  lang: LangKey;
  setLang: (lang: LangKey) => void;
  toggleLang: () => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'gu',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangKey>('gu');

  useEffect(() => {
    let isActive = true;
    AsyncStorage.getItem('appLanguage').then((val) => {
      if (!isActive) return;
      if (val === 'en' || val === 'gu') setLangState(val);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const setLang = (l: LangKey) => {
    setLangState(l);
    AsyncStorage.setItem('appLanguage', l);
  };

  const toggleLang = () => {
    setLang(lang === 'gu' ? 'en' : 'gu');
  };

  const t = (key: string) => translate(key, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
