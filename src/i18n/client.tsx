"use client";

import React, { createContext, useContext } from "react";
import type { Dictionary } from "./server";

interface I18nContextType {
  dictionary: Dictionary;
  locale: string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  dictionary,
  locale,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
  locale: string;
}) {
  return (
    <I18nContext.Provider value={{ dictionary, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }

  // Helper to fetch nested string keys (e.g. "settings.title")
  const t = (key?: string, values?: Record<string, string | number>): string => {
    if (!key || typeof key !== "string") return "";
    
    const keys = key.split(".");
    let value: unknown = context.dictionary;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    
    let str = typeof value === "string" ? value : key;
    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return { t, locale: context.locale };
}
