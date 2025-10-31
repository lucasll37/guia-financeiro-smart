import { useState, useEffect } from "react";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useAuth } from "@/hooks/useAuth";
export type Language = "pt-BR" | "en-US";
export type Currency = "BRL" | "USD" | "EUR";
export type DateFormat = "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";

export interface UserPreferences {
  language: Language;
  currency: Currency;
  dateFormat: DateFormat;
  theme: "light" | "dark" | "system";
  hideValuesOnLogin: boolean;
}

const defaultPreferences: UserPreferences = {
  language: "pt-BR",
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  theme: "system",
  hideValuesOnLogin: false,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const storageKey = user?.id ? `user-preferences:${user.id}` : "user-preferences";
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem(storageKey);
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
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
      } catch {
        setPreferences(defaultPreferences);
      }
    } else {
      setPreferences(defaultPreferences);
    }
  }, [storageKey]);
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
