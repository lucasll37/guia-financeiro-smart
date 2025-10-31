import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface MaskValuesContextType {
  isMasked: boolean;
  toggleMask: () => void;
  maskValue: (value: number | string) => string;
}

const MaskValuesContext = createContext<MaskValuesContextType | undefined>(undefined);

export function MaskValuesProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(() => {
    // Inicializar APENAS no primeiro load com base na preferência do usuário
    const saved = localStorage.getItem("user-preferences");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        return prefs.hideValuesOnLogin === true;
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleMask = () => setIsMasked((prev) => !prev);

  const maskValue = (value: number | string) => {
    if (!isMasked) return String(value);
    
    // Sempre retorna um valor mascarado de tamanho fixo, 
    // independente do tamanho real do número
    const str = String(value);
    // Detecta se tem símbolo de moeda
    const hasCurrency = str.includes("R$") || str.includes("$");
    
    if (hasCurrency) {
      return "R$ ••••••";
    }
    
    // Para números sem moeda ou percentuais
    if (str.includes("%")) {
      return "••••%";
    }
    
    return "••••••";
  };

  return (
    <MaskValuesContext.Provider value={{ isMasked, toggleMask, maskValue }}>
      {children}
    </MaskValuesContext.Provider>
  );
}

export function useMaskValues() {
  const context = useContext(MaskValuesContext);
  if (!context) {
    throw new Error("useMaskValues must be used within MaskValuesProvider");
  }
  return context;
}
