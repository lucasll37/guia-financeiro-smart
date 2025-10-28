import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];
type InvestmentInsert = Database["public"]["Tables"]["investment_assets"]["Insert"];
type InvestmentUpdate = Database["public"]["Tables"]["investment_assets"]["Update"];

export function useInvestments(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investments, isLoading } = useQuery({
    queryKey: ["investments", accountId],
    queryFn: async () => {
      let query = supabase.from("investment_assets").select("*");

      // If accountId is provided, filter by it (optional association)
      // Otherwise, fetch all investments the user has access to (owned or shared)
      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return data as Investment[];
    },
  });

  const createInvestment = useMutation({
    mutationFn: async (investment: InvestmentInsert) => {
      const { data, error } = await supabase
        .from("investment_assets")
        .insert(investment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({
        title: "Investimento criado",
        description: "Seu investimento foi criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar investimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, ...updates }: InvestmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("investment_assets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({
        title: "Investimento atualizado",
        description: "Seu investimento foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar investimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investment_assets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({
        title: "Investimento excluído",
        description: "Seu investimento foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir investimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    investments,
    isLoading,
    createInvestment,
    updateInvestment,
    deleteInvestment,
  };
}
