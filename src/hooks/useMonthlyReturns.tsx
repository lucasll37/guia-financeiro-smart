import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];
type MonthlyReturnInsert = Database["public"]["Tables"]["investment_monthly_returns"]["Insert"];
type MonthlyReturnUpdate = Database["public"]["Tables"]["investment_monthly_returns"]["Update"];

export function useMonthlyReturns(investmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: returns, isLoading } = useQuery({
    queryKey: ["monthly-returns", investmentId],
    queryFn: async () => {
      if (!investmentId) return [];
      
      const { data, error } = await supabase
        .from("investment_monthly_returns")
        .select("*")
        .eq("investment_id", investmentId)
        .order("month", { ascending: false });

      if (error) throw error;
      return data as MonthlyReturn[];
    },
    enabled: !!investmentId,
  });

  const createReturn = useMutation({
    mutationFn: async (returnData: MonthlyReturnInsert) => {
      const { data, error } = await supabase
        .from("investment_monthly_returns")
        .insert(returnData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      toast({
        title: "Rendimento registrado",
        description: "O rendimento mensal foi registrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar rendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReturn = useMutation({
    mutationFn: async ({ id, ...updates }: MonthlyReturnUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("investment_monthly_returns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      toast({
        title: "Rendimento atualizado",
        description: "O rendimento mensal foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar rendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReturn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investment_monthly_returns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      toast({
        title: "Rendimento excluído",
        description: "O rendimento mensal foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir rendimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    returns,
    isLoading,
    createReturn,
    updateReturn,
    deleteReturn,
  };
}
