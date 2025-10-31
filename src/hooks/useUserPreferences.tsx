import { useState, useEffect } from "react";
import { useMaskValues } from "@/hooks/useMaskValues";
export type Language = "pt-BR" | "en-US";
export type Currency = "BRL" | "USD" | "EUR";
export type DateFormat = "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";

export interface UserPreferences {
  language: Language;
  currency: Currency;
  dateFormat: DateFormat;
  theme: "light" | "dark" | "system";
  showValuesByDefault: boolean;
}

const defaultPreferences: UserPreferences = {
  language: "pt-BR",
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  theme: "system",
  showValuesByDefault: false,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("user-preferences");
    if (saved) {
      try {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      } catch {
        return defaultPreferences;
      }
    }
    return defaultPreferences;
  });

  const { maskValue, isMasked } = useMaskValues();

  useEffect(() => {
    localStorage.setItem("user-preferences", JSON.stringify(preferences));
  }, [preferences]);
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const formatCurrency = (value: number) => {
    const currencyConfig = {
      BRL: { locale: "pt-BR", currency: "BRL" },
      USD: { locale: "en-US", currency: "USD" },
      EUR: { locale: "de-DE", currency: "EUR" },
    } as const;

    const config = currencyConfig[preferences.currency];
    const formatted = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
    }).format(value);

    return isMasked ? maskValue(formatted) : formatted;
  };

  const formatDate = (date: Date) => {
    const formats = {
      "dd/MM/yyyy": "pt-BR",
      "MM/dd/yyyy": "en-US",
      "yyyy-MM-dd": "en-CA",
    };

    return new Intl.DateTimeFormat(formats[preferences.dateFormat]).format(date);
  };

  return {
    preferences,
    updatePreferences,
    formatCurrency,
    formatDate,
  };
}
