import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface MaskValuesContextType {
  isMasked: boolean;
  toggleMask: () => void;
  maskValue: (value: number | string) => string;
}

const MaskValuesContext = createContext<MaskValuesContextType | undefined>(undefined);

export function MaskValuesProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(() => {
    // Inicializar com base na preferência do usuário
    const saved = localStorage.getItem("user-preferences");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        // Se showValuesByDefault for true, valores NÃO devem estar mascarados
        // Se showValuesByDefault for false (padrão), valores devem estar mascarados
        return !prefs.showValuesByDefault;
      } catch {
        return true; // Padrão: mascarado
      }
    }
    return true; // Padrão: mascarado
  });

  // Sincronizar com mudanças nas preferências
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user-preferences");
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          setIsMasked(!prefs.showValuesByDefault);
        } catch {
          // Ignorar erros de parsing
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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
