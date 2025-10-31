import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DecimalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number | null | undefined;
  onValueChange: (value: number | null, raw: string) => void;
  allowNegative?: boolean;
}

function sanitizeRaw(raw: string, allowNegative: boolean) {
  let v = raw.replace(/,/g, ".");
  // Remove invalid chars
  v = v.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, "");
  // Keep only a single leading minus
  if (allowNegative) {
    v = v.replace(/(?!^)-/g, "");
  } else {
    v = v.replace(/-/g, "");
  }
  // Keep only first dot
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  return v;
}

export function DecimalInput({
  value,
  onValueChange,
  allowNegative = true,
  className,
  onChange,
  ...props
}: DecimalInputProps) {
  const [raw, setRaw] = useState<string>(value ?? value === 0 ? String(value) : "");

  useEffect(() => {
    // Sync when external value changes (e.g., form reset)
    const normalized = value ?? value === 0 ? String(value) : "";
    // Don't override while user is typing trailing dot
    if (raw !== normalized && raw !== normalized + ".") {
      setRaw(normalized);
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
        const parsed = sanitized === "" || sanitized === "." || sanitized === "-" || sanitized === "-." ? null : Number(sanitized);
        if (!Number.isNaN(parsed as number) && parsed !== null) {
          onValueChange(parsed as number, sanitized);
        } else {
          // For empty or partial values, propagate null but keep raw in input
          onValueChange(null, sanitized);
        }
        onChange?.(e);
      }}
      className={cn(className)}
      {...props}
    />
  );
}

export default DecimalInput;
