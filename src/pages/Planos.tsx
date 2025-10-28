import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Planos() {
  const { subscription, isLoading, getPlanLabel } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    document.title = "Planos e Preços - Prospera";
  }, []);

  const handleUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast.error("Erro ao processar upgrade. Tente novamente.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: "/mês",
      description: "Ideal para começar a organizar suas finanças",
      features: [
        "Até 1 conta",
        "Categorias fixas",
        "Sem geração de relatórios",
        "Suporte por email",
      ],
      highlighted: false,
      plan: "free",
    },
    {
      name: "Pro",
      price: "R$ 9,90",
      period: "/mês",
      description: "Para quem precisa de recursos avançados",
      features: [
        "Até 5 contas",
        "Até 5 cartões de crédito",
        "Tema claro ou escuro",
        "Contas compartilhadas com repartição proporcional",
        "Geração de relatórios",
        "Análises avançadas",
        "Previsões financeiras",
        "Suporte prioritário",
      ],
      highlighted: true,
      plan: "pro",
    },
  ];

  const currentPlan = subscription?.plan || "free";

  return (
    <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu plano</h1>
          <p className="text-muted-foreground text-lg">
            Comece gratuitamente ou desbloqueie recursos avançados com o plano Pro
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.plan;
              
              return (
                <Card
                  key={plan.name}
                  className={`relative ${
                    plan.highlighted
                      ? "border-primary shadow-lg scale-105"
                      : ""
                  } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-4">
                      <Badge variant="secondary">Seu Plano Atual</Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    {plan.plan === "free" ? (
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? "secondary" : "outline"}
                        disabled={isCurrentPlan}
                      >
                        {isCurrentPlan ? "Plano Atual" : "Plano Gratuito"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={isCurrentPlan || checkoutLoading}
                        onClick={handleUpgrade}
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : isCurrentPlan ? (
                          "Plano Atual"
                        ) : (
                          "Fazer Upgrade"
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Todos os pagamentos são processados de forma segura através do Stripe.
            <br />
            Você pode cancelar sua assinatura a qualquer momento.
          </p>
        </div>
    </div>
  );
}
