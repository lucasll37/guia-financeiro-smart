import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Save, Settings } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PlanLimit = Database["public"]["Tables"]["plan_limits"]["Row"];
type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export function PlanLimitsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState({
    max_accounts: 0,
    max_credit_cards: 0,
  });

  // Fetch plan limits
  const { data: planLimits, isLoading } = useQuery({
    queryKey: ["plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("plan", { ascending: true });

      if (error) throw error;
      return data as PlanLimit[];
    },
  });

  // Update plan limits mutation
  const updatePlanLimit = useMutation({
    mutationFn: async ({ plan, max_accounts, max_credit_cards }: {
      plan: SubscriptionPlan;
      max_accounts: number;
      max_credit_cards: number;
    }) => {
      const { error } = await supabase
        .from("plan_limits")
        .update({
          max_accounts,
          max_credit_cards,
        })
        .eq("plan", plan);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
      toast({
        title: "Limites atualizados!",
        description: "Os limites do plano foram atualizados com sucesso.",
      });
      setEditingPlan(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar limites",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (limit: PlanLimit) => {
    setEditingPlan(limit.plan);
    setEditForm({
      max_accounts: limit.max_accounts,
      max_credit_cards: limit.max_credit_cards,
    });
  };

  const handleSave = () => {
    if (!editingPlan) return;

    if (editForm.max_accounts < 1 || editForm.max_credit_cards < 1) {
      toast({
        title: "Valores inválidos",
        description: "Os limites devem ser maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    updatePlanLimit.mutate({
      plan: editingPlan,
      max_accounts: editForm.max_accounts,
      max_credit_cards: editForm.max_credit_cards,
    });
  };

  const getPlanLabel = (plan: SubscriptionPlan) => {
    const labels: Record<SubscriptionPlan, string> = {
      free: "Free",
      plus: "Plus",
      pro: "Pro",
    };
    return labels[plan];
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    const colors: Record<SubscriptionPlan, "default" | "secondary" | "destructive"> = {
      free: "secondary",
      plus: "default",
      pro: "destructive",
    };
    return colors[plan];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Limites de Planos</CardTitle>
        </div>
        <CardDescription>
          Configure quantas contas e cartões de crédito cada plano pode ter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {planLimits?.map((limit) => (
            <div key={limit.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getPlanColor(limit.plan)}>
                    {getPlanLabel(limit.plan)}
                  </Badge>
                </div>
                {editingPlan !== limit.plan && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(limit)}
                  >
                    Editar
                  </Button>
                )}
              </div>

              {editingPlan === limit.plan ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`accounts-${limit.plan}`}>
                      Máximo de Contas
                    </Label>
                    <Input
                      id={`accounts-${limit.plan}`}
                      type="number"
                      min="1"
                      value={editForm.max_accounts}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          max_accounts: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`cards-${limit.plan}`}>
                      Máximo de Cartões de Crédito
                    </Label>
                    <Input
                      id={`cards-${limit.plan}`}
                      type="number"
                      min="1"
                      value={editForm.max_credit_cards}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          max_credit_cards: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setEditingPlan(null)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={updatePlanLimit.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contas:</span>
                    <span className="ml-2 font-medium">
                      {limit.max_accounts === 999 ? "Ilimitado" : limit.max_accounts}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cartões:</span>
                    <span className="ml-2 font-medium">
                      {limit.max_credit_cards === 999 ? "Ilimitado" : limit.max_credit_cards}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
