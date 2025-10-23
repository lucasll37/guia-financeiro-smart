import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type BudgetInsert = Database["public"]["Tables"]["budgets"]["Insert"];
type BudgetUpdate = Database["public"]["Tables"]["budgets"]["Update"];

export function useBudgets(accountId?: string, period?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", accountId, period],
    queryFn: async () => {
      let query = supabase.from("budgets").select("*, categories(name, type, color)");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      if (period) {
        query = query.eq("period", period);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId || accountId === undefined,
  });

  const createBudget = useMutation({
    mutationFn: async (budget: BudgetInsert) => {
      const { data, error } = await supabase
        .from("budgets")
        .insert(budget)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Orçamento criado",
        description: "Seu orçamento foi criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: BudgetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Orçamento atualizado",
        description: "Seu orçamento foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: "Orçamento excluído",
        description: "Seu orçamento foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir orçamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    budgets,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
