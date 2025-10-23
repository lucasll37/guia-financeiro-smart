import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlanCard } from "@/components/subscription/PlanCard";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CreditCard, TrendingUp } from "lucide-react";

export default function Subscription() {
  const {
    subscription,
    isLoading,
    subscribe,
    openBillingPortal,
    isTrialing,
    isCanceled,
  } = useSubscription();
  
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const isBillingAnnual = billingCycle === "annual";

  const plans = [
    {
      plan: "free" as const,
      title: "Free",
      description: "Para começar a organizar suas finanças",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "1 conta bancária",
        "Até 100 lançamentos por mês",
        "Categorias ilimitadas",
        "Gráficos básicos",
        "Dashboard resumido",
      ],
    },
    {
      plan: "plus" as const,
      title: "Plus",
      description: "Para quem quer ir além do básico",
      monthlyPrice: 19.9,
      annualPrice: 199,
      features: [
        "Até 5 contas bancárias",
        "Lançamentos ilimitados",
        "Metas financeiras",
        "Notificações inteligentes",
        "Relatórios em PDF",
        "Exportação CSV e Excel",
        "14 dias de teste grátis",
      ],
    },
    {
      plan: "pro" as const,
      title: "Pro",
      description: "Controle total das suas finanças",
      monthlyPrice: 39.9,
      annualPrice: 399,
      features: [
        "Contas ilimitadas",
        "Contas compartilhadas com divisão",
        "Módulo de investimentos",
        "Projeções com IA",
        "Suporte prioritário",
        "Todos os recursos do Plus",
        "14 dias de teste grátis",
      ],
    },
  ];

  const handleSubscribe = (plan: "plus" | "pro", cycle: "monthly" | "annual") => {
    subscribe.mutate({ plan, billing_cycle: cycle });
  };

  const handleManageBilling = () => {
    openBillingPortal.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (isTrialing) {
      return (
        <Badge variant="default" className="bg-accent">
          Período de teste
        </Badge>
      );
    }

    if (isCanceled) {
      return <Badge variant="destructive">Cancelado</Badge>;
    }

    if (subscription.status === "active") {
      return <Badge variant="default">Ativo</Badge>;
    }

    return <Badge variant="outline">{subscription.status}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planos e Assinatura</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para suas necessidades
        </p>
      </div>

      {subscription && subscription.plan !== "free" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sua Assinatura</CardTitle>
                <CardDescription>Gerencie sua assinatura e cobrança</CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="text-sm font-medium">Plano Atual</p>
                  <p className="text-2xl font-bold capitalize">{subscription.plan}</p>
                </div>
              </div>

              {subscription.billing_cycle && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm font-medium">Cobrança</p>
                    <p className="text-lg font-semibold">
                      {subscription.billing_cycle === "monthly" ? "Mensal" : "Anual"}
                    </p>
                  </div>
                </div>
              )}

              {subscription.current_period_end && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="text-sm font-medium">
                      {isCanceled ? "Válido até" : "Próxima cobrança"}
                    </p>
                    <p className="text-lg font-semibold">
                      {format(new Date(subscription.current_period_end), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isTrialing && subscription.trial_end && (
              <div className="rounded-lg bg-accent/10 p-4">
                <p className="text-sm font-medium">
                  Período de teste termina em{" "}
                  {format(new Date(subscription.trial_end), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você não será cobrado até o fim do período de teste
                </p>
              </div>
            )}

            <Button onClick={handleManageBilling} variant="outline" className="w-full">
              Gerenciar Assinatura no Stripe
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-cycle" className="text-base">
          Mensal
        </Label>
        <Switch
          id="billing-cycle"
          checked={isBillingAnnual}
          onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
        />
        <Label htmlFor="billing-cycle" className="text-base">
          Anual
          <Badge variant="secondary" className="ml-2">
            Economize até 17%
          </Badge>
        </Label>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.plan}
            plan={plan.plan}
            title={plan.title}
            description={plan.description}
            monthlyPrice={plan.monthlyPrice}
            annualPrice={plan.annualPrice}
            features={plan.features}
            isCurrentPlan={subscription?.plan === plan.plan}
            isBillingAnnual={isBillingAnnual}
            onSubscribe={handleSubscribe}
            loading={subscribe.isPending}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Posso cancelar a qualquer momento?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sim! Você pode cancelar sua assinatura a qualquer momento através do portal de
              gerenciamento. Você continuará tendo acesso até o fim do período pago.
            </p>
          </div>
          <div>
            <p className="font-medium">Como funciona o período de teste?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os planos pagos incluem 14 dias de teste gratuito. Você não será cobrado
              durante este período e pode cancelar antes do fim do teste sem nenhum custo.
            </p>
          </div>
          <div>
            <p className="font-medium">Posso mudar de plano depois?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento através
              do portal de gerenciamento. As alterações serão aplicadas proporcionalmente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
