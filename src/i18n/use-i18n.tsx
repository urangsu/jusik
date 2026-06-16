"use client";

import React, { createContext, useContext, useState } from "react";
import { Locale, DEFAULT_LOCALE } from "./locale";
import { ko } from "./dictionaries/ko";
import { en } from "./dictionaries/en";
import { setLocaleCookie } from "./locale-cookie";

type TranslationKey = keyof typeof ko;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string) => string;
  tSector: (sectorName: string | null) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries = { ko, en };

export const I18nProvider: React.FC<{
  children: React.ReactNode;
  initialLocale?: Locale;
}> = ({ children, initialLocale = DEFAULT_LOCALE }) => {
  // Initialize state with correct client-side values directly during creation to avoid useEffect synchronization loops
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLang = urlParams.get("lang");
      if (queryLang === "ko" || queryLang === "en") {
        return queryLang as Locale;
      }
      
      if (
        typeof localStorage !== "undefined" &&
        typeof localStorage.getItem === "function"
      ) {
        const localLang = localStorage.getItem("locale");
        if (localLang === "ko" || localLang === "en") {
          return localLang as Locale;
        }
      }
    }
    return initialLocale;
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocaleCookie(newLocale);
    if (
      typeof window !== "undefined" &&
      typeof localStorage !== "undefined" &&
      typeof localStorage.setItem === "function"
    ) {
      localStorage.setItem("locale", newLocale);
      
      // Update URL query lang param and trigger location reload
      const url = new URL(window.location.href);
      url.searchParams.set("lang", newLocale);
      window.location.href = url.pathname + url.search;
    }
  };

  const t = (key: TranslationKey | string): string => {
    const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
    return (dict as Record<string, string>)[key] ?? key;
  };

  const tSector = (sectorName: string | null): string => {
    if (!sectorName) return "";
    
    const keyMap: Record<string, string> = {
      "정보기술": "sector_IT",
      "Information Technology": "sector_IT",
      "Technology": "sector_IT",
      "금융": "sector_Financials",
      "Financials": "sector_Financials",
      "헬스케어": "sector_HealthCare",
      "Health Care": "sector_HealthCare",
      "Healthcare": "sector_HealthCare",
      "산업재": "sector_Industrials",
      "Industrials": "sector_Industrials",
      "경기소비재": "sector_ConsumerDiscretionary",
      "Consumer Discretionary": "sector_ConsumerDiscretionary",
      "커뮤니케이션": "sector_Communication",
      "Communication Services": "sector_Communication",
      "Communication": "sector_Communication",
      "소재": "sector_Materials",
      "Materials": "sector_Materials",
      "에너지": "sector_Energy",
      "Energy": "sector_Energy",
      "유틸리티": "sector_Utilities",
      "Utilities": "sector_Utilities",
      "필수소비재": "sector_ConsumerStaples",
      "Consumer Staples": "sector_ConsumerStaples",
      "부동산": "sector_RealEstate",
      "Real Estate": "sector_RealEstate",
    };

    const dictKey = keyMap[sectorName];
    if (dictKey) {
      return t(dictKey);
    }
    return sectorName;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tSector }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string): string => {
        return (ko as Record<string, string>)[key] ?? key;
      },
      tSector: (sectorName: string | null): string => {
        if (!sectorName) return "";
        const keyMap: Record<string, string> = {
          "정보기술": "sector_IT",
          "Information Technology": "sector_IT",
          "Technology": "sector_IT",
          "금융": "sector_Financials",
          "Financials": "sector_Financials",
          "헬스케어": "sector_HealthCare",
          "Health Care": "sector_HealthCare",
          "Healthcare": "sector_HealthCare",
          "산업재": "sector_Industrials",
          "Industrials": "sector_Industrials",
          "경기소비재": "sector_ConsumerDiscretionary",
          "Consumer Discretionary": "sector_ConsumerDiscretionary",
          "커뮤니케이션": "sector_Communication",
          "Communication Services": "sector_Communication",
          "Communication": "sector_Communication",
          "소재": "sector_Materials",
          "Materials": "sector_Materials",
          "에너지": "sector_Energy",
          "Energy": "sector_Energy",
          "유틸리티": "sector_Utilities",
          "Utilities": "sector_Utilities",
          "필수소비재": "sector_ConsumerStaples",
          "Consumer Staples": "sector_ConsumerStaples",
          "부동산": "sector_RealEstate",
          "Real Estate": "sector_RealEstate",
        };
        const dictKey = keyMap[sectorName];
        if (dictKey) {
          return (ko as Record<string, string>)[dictKey] ?? sectorName;
        }
        return sectorName;
      },
    };
  }
  return context;
};
