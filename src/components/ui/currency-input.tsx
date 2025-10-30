import * as React from "react";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: number | string;
  onChange: (value: number) => void;
  allowNegative?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, allowNegative = false, ...props }, ref) => {
    const { preferences } = useUserPreferences();
    const [displayValue, setDisplayValue] = React.useState("");

    const getCurrencySymbol = () => {
      switch (preferences.currency) {
        case "BRL": return "R$";
        case "USD": return "$";
        case "EUR": return "€";
        default: return "R$";
      }
    };

    const getDecimalSeparator = () => {
      switch (preferences.currency) {
        case "BRL": return ",";
        case "USD": return ".";
        case "EUR": return ",";
        default: return ",";
      }
    };

    const getThousandSeparator = () => {
      switch (preferences.currency) {
        case "BRL": return ".";
        case "USD": return ",";
        case "EUR": return ".";
        default: return ".";
      }
    };

    const formatValue = (val: number | string): string => {
      if (val === "" || val === null || val === undefined) return "";
      
      const numValue = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(numValue)) return "";

      const isNegative = numValue < 0;
      const absValue = Math.abs(numValue);
      
      const decimalSep = getDecimalSeparator();
      const thousandSep = getThousandSeparator();
      
      // Split into integer and decimal parts
      const parts = absValue.toFixed(2).split(".");
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
      const decimalPart = parts[1];
      
      const formatted = `${integerPart}${decimalSep}${decimalPart}`;
      return isNegative && allowNegative ? `-${formatted}` : formatted;
    };

    const parseValue = (displayVal: string): number => {
      if (!displayVal) return 0;
      
      const decimalSep = getDecimalSeparator();
      const thousandSep = getThousandSeparator();
      
      // Remove currency symbol and spaces
      let cleanValue = displayVal.replace(/[^\d\-,\.]/g, "");
      
      // Handle negative
      const isNegative = cleanValue.startsWith("-");
      if (isNegative) cleanValue = cleanValue.substring(1);
      
      // Replace separators to standard format
      cleanValue = cleanValue.replace(new RegExp(`\\${thousandSep}`, 'g'), "");
      cleanValue = cleanValue.replace(new RegExp(`\\${decimalSep}`), ".");
      
      const numValue = parseFloat(cleanValue) || 0;
      return isNegative && allowNegative ? -numValue : numValue;
    };

    React.useEffect(() => {
      setDisplayValue(formatValue(value));
    }, [value, preferences.currency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow typing decimal separator and digits
      const decimalSep = getDecimalSeparator();
      const thousandSep = getThousandSeparator();
      const allowedChars = `0-9\\${decimalSep}\\${thousandSep}${allowNegative ? "\\-" : ""}`;
      const regex = new RegExp(`^[${allowedChars}]*$`);
      
      if (!regex.test(inputValue) && inputValue !== "") return;
      
      setDisplayValue(inputValue);
      
      // Only trigger onChange if we have a valid number
      if (inputValue === "" || inputValue === decimalSep || inputValue === "-") {
        onChange(0);
        return;
      }
      
      const numValue = parseValue(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    };

    const handleBlur = () => {
      // Format the value on blur
      const numValue = parseValue(displayValue);
      setDisplayValue(formatValue(numValue));
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {getCurrencySymbol()}
        </span>
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-12 pr-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
