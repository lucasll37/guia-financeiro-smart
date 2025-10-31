import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export interface PasswordValidation {
  isValid: boolean;
  strength: number;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function validatePassword(password: string): PasswordValidation {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  const strength = (metRequirements / 5) * 100;
  const isValid = metRequirements === 5;

  return { isValid, strength, requirements };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => validatePassword(password), [password]);

  if (!password) return null;

  const getStrengthColor = () => {
    if (validation.strength >= 80) return "bg-green-500";
    if (validation.strength >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStrengthText = () => {
    if (validation.strength >= 80) return "Forte";
    if (validation.strength >= 60) return "Média";
    return "Fraca";
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Força da senha:</span>
          <span className={cn(
            "font-medium",
            validation.strength >= 80 && "text-green-600 dark:text-green-400",
            validation.strength >= 60 && validation.strength < 80 && "text-yellow-600 dark:text-yellow-400",
            validation.strength < 60 && "text-red-600 dark:text-red-400"
          )}>
            {getStrengthText()}
          </span>
        </div>
        <Progress value={validation.strength} className={cn("h-1.5", getStrengthColor())} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Requisitos da senha:</p>
        <ul className="space-y-1">
          <RequirementItem
            met={validation.requirements.length}
            text="Mínimo de 8 caracteres"
          />
          <RequirementItem
            met={validation.requirements.uppercase}
            text="Uma letra maiúscula (A-Z)"
          />
          <RequirementItem
            met={validation.requirements.lowercase}
            text="Uma letra minúscula (a-z)"
          />
          <RequirementItem
            met={validation.requirements.number}
            text="Um número (0-9)"
          />
          <RequirementItem
            met={validation.requirements.special}
            text="Um caractere especial (!@#$%...)"
          />
        </ul>
      </div>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
      )}
      <span className={cn(
        met ? "text-foreground" : "text-muted-foreground"
      )}>
        {text}
      </span>
    </li>
  );
}
