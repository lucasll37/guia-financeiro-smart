import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface UpgradeBannerProps {
  title: string;
  description: string;
  requiredPlan: "plus" | "pro";
}

export function UpgradeBanner({ title, description, requiredPlan }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="relative">
      <Sparkles className="h-4 w-4" />
      <AlertDescription className="pr-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Button onClick={() => navigate("/assinatura")} size="sm">
            Fazer Upgrade para {requiredPlan === "plus" ? "Plus" : "Pro"}
          </Button>
        </div>
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-muted rounded-sm"
        aria-label="Fechar banner"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
