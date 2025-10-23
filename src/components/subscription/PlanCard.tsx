import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

interface PlanCardProps {
  plan: SubscriptionPlan;
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isCurrentPlan: boolean;
  isBillingAnnual: boolean;
  onSubscribe: (plan: "plus" | "pro", cycle: "monthly" | "annual") => void;
  loading: boolean;
}

export function PlanCard({
  plan,
  title,
  description,
  monthlyPrice,
  annualPrice,
  features,
  isCurrentPlan,
  isBillingAnnual,
  onSubscribe,
  loading,
}: PlanCardProps) {
  const price = isBillingAnnual ? annualPrice : monthlyPrice;
  const pricePerMonth = isBillingAnnual ? (annualPrice / 12).toFixed(2) : monthlyPrice.toFixed(2);
  const savings = isBillingAnnual && monthlyPrice > 0
    ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100)
    : 0;

  const handleSubscribe = () => {
    if (plan === "free") return;
    onSubscribe(plan as "plus" | "pro", isBillingAnnual ? "annual" : "monthly");
  };

  return (
    <Card className={`relative ${isCurrentPlan ? "border-primary" : ""}`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Plano Atual</Badge>
        </div>
      )}
      
      {plan === "pro" && (
        <div className="absolute -top-3 right-4">
          <Badge variant="default" className="bg-accent">
            <Zap className="h-3 w-3 mr-1" />
            Mais Popular
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          {price === 0 ? (
            <div className="text-4xl font-bold">Grátis</div>
          ) : (
            <>
              <div className="text-4xl font-bold">
                R$ {pricePerMonth}
                <span className="text-lg font-normal text-muted-foreground">/mês</span>
              </div>
              {isBillingAnnual && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    R$ {price.toFixed(2)} cobrado anualmente
                  </p>
                  {savings > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Economize {savings}%
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {plan === "free" ? (
          <Button variant={isCurrentPlan ? "outline" : "default"} className="w-full" disabled>
            {isCurrentPlan ? "Plano Gratuito" : "Começar Grátis"}
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={loading || isCurrentPlan}
            className="w-full"
            variant={isCurrentPlan ? "outline" : "default"}
          >
            {isCurrentPlan
              ? "Plano Atual"
              : plan === "plus"
              ? "Assinar Plus"
              : "Assinar Pro"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
