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
    max_investments: 0,
    can_edit_categories: false,
    can_generate_reports: false,
    can_access_ai_tutor: false,
    can_share_accounts: false,
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
    mutationFn: async ({ plan, max_accounts, max_credit_cards, max_investments, can_edit_categories, can_generate_reports, can_access_ai_tutor, can_share_accounts }: {
      plan: SubscriptionPlan;
      max_accounts: number;
      max_credit_cards: number;
      max_investments: number;
      can_edit_categories: boolean;
      can_generate_reports: boolean;
      can_access_ai_tutor: boolean;
      can_share_accounts: boolean;
    }) => {
      const { error } = await supabase
        .from("plan_limits")
        .update({
          max_accounts,
          max_credit_cards,
          max_investments,
          can_edit_categories,
          can_generate_reports,
          can_access_ai_tutor,
          can_share_accounts,
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
      max_investments: limit.max_investments,
      can_edit_categories: limit.can_edit_categories,
      can_generate_reports: limit.can_generate_reports,
      can_access_ai_tutor: limit.can_access_ai_tutor,
      can_share_accounts: limit.can_share_accounts,
    });
  };

  const handleSave = () => {
    if (!editingPlan) return;

    if (editForm.max_accounts < 1 || editForm.max_credit_cards < 1 || editForm.max_investments < 1) {
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
      max_investments: editForm.max_investments,
      can_edit_categories: editForm.can_edit_categories,
      can_generate_reports: editForm.can_generate_reports,
      can_access_ai_tutor: editForm.can_access_ai_tutor,
      can_share_accounts: editForm.can_share_accounts,
    });
  };

  const getPlanLabel = (plan: SubscriptionPlan) => {
    const labels: Partial<Record<SubscriptionPlan, string>> = {
      free: "Free",
      pro: "Pro",
    };
    return labels[plan] || plan;
  };

  const getPlanColor = (plan: SubscriptionPlan) => {
    const colors: Partial<Record<SubscriptionPlan, "default" | "secondary" | "destructive">> = {
      free: "secondary",
      pro: "destructive",
    };
    return colors[plan] || "default";
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
          Configure limites e permissões para cada plano de assinatura
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
                <div className="space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor={`investments-${limit.plan}`}>
                        Máximo de Investimentos
                      </Label>
                      <Input
                        id={`investments-${limit.plan}`}
                        type="number"
                        min="1"
                        value={editForm.max_investments}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            max_investments: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-base font-medium">Permissões</Label>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-categories-${limit.plan}`}
                        checked={editForm.can_edit_categories}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            can_edit_categories: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor={`edit-categories-${limit.plan}`} className="font-normal cursor-pointer">
                        Pode editar categorias
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`generate-reports-${limit.plan}`}
                        checked={editForm.can_generate_reports}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            can_generate_reports: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor={`generate-reports-${limit.plan}`} className="font-normal cursor-pointer">
                        Pode gerar relatórios
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`access-ai-tutor-${limit.plan}`}
                        checked={editForm.can_access_ai_tutor}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            can_access_ai_tutor: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor={`access-ai-tutor-${limit.plan}`} className="font-normal cursor-pointer">
                        Pode acessar Tutor IA
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`share-accounts-${limit.plan}`}
                        checked={editForm.can_share_accounts}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            can_share_accounts: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor={`share-accounts-${limit.plan}`} className="font-normal cursor-pointer">
                        Pode compartilhar contas
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
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
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
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
                    <div>
                      <span className="text-muted-foreground">Investimentos:</span>
                      <span className="ml-2 font-medium">
                        {limit.max_investments === 999 ? "Ilimitado" : limit.max_investments}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">Permissões:</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={limit.can_edit_categories ? "default" : "secondary"}>
                        {limit.can_edit_categories ? "✓" : "✗"} Editar categorias
                      </Badge>
                      <Badge variant={limit.can_generate_reports ? "default" : "secondary"}>
                        {limit.can_generate_reports ? "✓" : "✗"} Gerar relatórios
                      </Badge>
                      <Badge variant={limit.can_access_ai_tutor ? "default" : "secondary"}>
                        {limit.can_access_ai_tutor ? "✓" : "✗"} Acessar Tutor IA
                      </Badge>
                      <Badge variant={limit.can_share_accounts ? "default" : "secondary"}>
                        {limit.can_share_accounts ? "✓" : "✗"} Compartilhar contas
                      </Badge>
                    </div>
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
