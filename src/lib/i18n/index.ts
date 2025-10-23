import { ptBR, type Translation } from "./pt-BR";

const translations: Record<string, Translation> = {
  "pt-BR": ptBR,
};

export const t = (key: string, locale: string = "pt-BR"): string => {
  const keys = key.split(".");
  let value: any = translations[locale];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};

export { ptBR };
export type { Translation };
