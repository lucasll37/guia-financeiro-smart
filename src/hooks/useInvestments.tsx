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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's own investments
      let ownQuery = supabase
        .from("investment_assets")
        .select("*")
        .eq("owner_id", user.id);

      if (accountId) {
        ownQuery = ownQuery.eq("account_id", accountId);
      }

      const { data: ownInvestments, error: ownError } = await ownQuery;
      if (ownError) throw ownError;

      // Get investments shared with user (accepted memberships)
      const { data: memberships, error: membershipsError } = await supabase
        .from("investment_members")
        .select("investment_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (membershipsError) throw membershipsError;

      const sharedInvestmentIds = memberships?.map(m => m.investment_id) || [];

      // Get shared investments
      let sharedInvestments: Investment[] = [];
      if (sharedInvestmentIds.length > 0) {
        let sharedQuery = supabase
          .from("investment_assets")
          .select("*")
          .in("id", sharedInvestmentIds);

        if (accountId) {
          sharedQuery = sharedQuery.eq("account_id", accountId);
        }

        const { data, error } = await sharedQuery;
        if (error) throw error;
        sharedInvestments = data || [];
      }

      // Combine and deduplicate
      const allInvestments = [...(ownInvestments || []), ...sharedInvestments];
      const uniqueInvestments = Array.from(
        new Map(allInvestments.map(inv => [inv.id, inv])).values()
      );

      return uniqueInvestments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
