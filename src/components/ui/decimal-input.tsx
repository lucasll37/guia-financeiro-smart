import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DecimalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number | null | undefined;
  onValueChange: (value: number | null, raw: string) => void;
  allowNegative?: boolean;
}

function sanitizeRaw(raw: string, allowNegative: boolean) {
  let v = raw;
  // Remove invalid chars (allow comma)
  v = v.replace(allowNegative ? /[^0-9,\-]/g : /[^0-9,]/g, "");
  // Keep only a single leading minus
  if (allowNegative) {
    v = v.replace(/(?!^)-/g, "");
  } else {
    v = v.replace(/-/g, "");
  }
  // Keep only first comma
  const firstComma = v.indexOf(",");
  if (firstComma !== -1) {
    v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, "");
  }
  return v;
}

function parseValue(raw: string): number | null {
  const normalized = raw.replace(",", ".");
  const parsed = normalized === "" || normalized === "." || normalized === "-" || normalized === "-." ? null : Number(normalized);
  return Number.isNaN(parsed as number) ? null : parsed;
}

function formatForDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

export function DecimalInput({
  value,
  onValueChange,
  allowNegative = true,
  className,
  onChange,
  ...props
}: DecimalInputProps) {
  const [raw, setRaw] = useState<string>(formatForDisplay(value));

  useEffect(() => {
    // Sync when external value changes (e.g., form reset)
    const formatted = formatForDisplay(value);
    // Don't override while user is typing trailing comma
    if (raw !== formatted && raw !== formatted + ",") {
      setRaw(formatted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={(e) => {
        const sanitized = sanitizeRaw(e.target.value, allowNegative);
        setRaw(sanitized);
        const parsed = parseValue(sanitized);
        onValueChange(parsed, sanitized);
        onChange?.(e);
      }}
      className={cn(className)}
      {...props}
    />
  );
}

export default DecimalInput;
