import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

interface RequirePlanProps {
  children: ReactNode;
  requiredPlan: SubscriptionPlan;
  feature: string;
  description: string;
}

export function RequirePlan({
  children,
  requiredPlan,
  feature,
  description,
}: RequirePlanProps) {
  const { hasAccess, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!hasAccess(requiredPlan)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Recurso Premium</CardTitle>
            <CardDescription>{feature}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {description}
            </p>
            <Button
              onClick={() => navigate("/assinatura")}
              className="w-full"
              size="lg"
            >
              Fazer Upgrade para {requiredPlan === "plus" ? "Plus" : "Pro"}
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
