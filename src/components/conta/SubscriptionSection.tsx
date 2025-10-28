import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, CreditCard, Calendar, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SubscriptionSection() {
  const { subscription, isLoading, getPlanLabel, getStatusLabel } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-500",
      plus: "bg-blue-500",
      pro: "bg-purple-500",
    };
    return colors[plan] || "bg-gray-500";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-600",
      trialing: "bg-blue-600",
      canceled: "bg-red-600",
      past_due: "bg-orange-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const planFeatures: Record<string, string[]> = {
    free: [
      "3 contas",
      "Categorias ilimitadas",
      "Relatórios básicos",
      "Suporte por email",
    ],
    plus: [
      "10 contas",
      "Tudo do Free",
      "Análises avançadas",
      "Previsões financeiras",
      "Suporte prioritário",
    ],
    pro: [
      "Contas ilimitadas",
      "Tudo do Plus",
      "Múltiplos usuários por conta",
      "Relatórios customizados",
      "API de integração",
      "Suporte 24/7",
    ],
  };

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assinatura</CardTitle>
            <CardDescription>Detalhes do seu plano atual</CardDescription>
          </div>
          {subscription && (
            <Badge className={getPlanColor(subscription.plan)}>
              {getPlanLabel(subscription.plan)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {subscription ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge className={getStatusColor(subscription.status)}>
                  {getStatusLabel(subscription.status)}
                </Badge>
              </div>

              {subscription.current_period_end && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Próxima renovação</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}

              {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Fim do período de teste</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(subscription.trial_end), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}

              {subscription.billing_cycle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Ciclo de pagamento</span>
                  </div>
                  <p className="font-medium capitalize">{subscription.billing_cycle}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold mb-3">Recursos incluídos:</h4>
              <ul className="space-y-2">
                {planFeatures[subscription.plan]?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {subscription.plan !== "pro" && (
              <div className="border-t pt-6">
                <Button className="w-full">Fazer Upgrade</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">Você não possui uma assinatura ativa</p>
            <Button>Escolher Plano</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
