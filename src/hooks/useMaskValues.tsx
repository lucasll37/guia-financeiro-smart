import { createContext, useContext, useState, ReactNode } from "react";

interface MaskValuesContextType {
  isMasked: boolean;
  toggleMask: () => void;
  maskValue: (value: number | string) => string;
}

const MaskValuesContext = createContext<MaskValuesContextType | undefined>(undefined);

export function MaskValuesProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(false);

  const toggleMask = () => setIsMasked((prev) => !prev);

  const maskValue = (value: number | string) => {
    if (!isMasked) return String(value);
    
    const str = String(value);
    // Mascara números mantendo símbolos de moeda e formatação
    return str.replace(/\d/g, "*");
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
