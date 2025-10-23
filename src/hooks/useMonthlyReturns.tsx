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
      // Get the investment to access its balance and initial_month
      const { data: investment } = await supabase
        .from("investment_assets")
        .select("balance, initial_month")
        .eq("id", returnData.investment_id)
        .single();

      if (!investment) throw new Error("Investment not found");

      // Get the most recent return to calculate next month and balance_after
      const { data: previousReturns } = await supabase
        .from("investment_monthly_returns")
        .select("*")
        .eq("investment_id", returnData.investment_id)
        .order("month", { ascending: false })
        .limit(1);

      // Calculate the next sequential month
      let nextMonth: string;
      if (previousReturns && previousReturns.length > 0) {
        const lastMonth = new Date(previousReturns[0].month);
        lastMonth.setMonth(lastMonth.getMonth() + 1);
        nextMonth = lastMonth.toISOString().split('T')[0].slice(0, 7) + '-01';
      } else {
        // First return, use initial_month
        nextMonth = investment.initial_month;
      }

      const previousBalance = previousReturns && previousReturns.length > 0
        ? Number(previousReturns[0].balance_after)
        : Number(investment.balance || 0);

      // Calculate balance_after = (previous balance + contribution) * (1 + actual_return%)
      const actualReturnRate = Number(returnData.actual_return) / 100;
      const balance_after = (previousBalance + Number(returnData.contribution)) * (1 + actualReturnRate);

      const { data, error } = await supabase
        .from("investment_monthly_returns")
        .insert({
          ...returnData,
          month: nextMonth,
          balance_after,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      queryClient.invalidateQueries({ queryKey: ["investment-current-value"] });
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
      // Get all returns for this investment up to the current month
      const { data: currentReturn } = await supabase
        .from("investment_monthly_returns")
        .select("investment_id, month")
        .eq("id", id)
        .single();

      if (!currentReturn) throw new Error("Return not found");

      // Get previous returns
      const { data: previousReturns } = await supabase
        .from("investment_monthly_returns")
        .select("*")
        .eq("investment_id", currentReturn.investment_id)
        .lt("month", currentReturn.month)
        .order("month", { ascending: false })
        .limit(1);

      // Get investment balance
      const { data: investment } = await supabase
        .from("investment_assets")
        .select("balance")
        .eq("id", currentReturn.investment_id)
        .single();

      const previousBalance = previousReturns && previousReturns.length > 0
        ? Number(previousReturns[0].balance_after)
        : Number(investment?.balance || 0);

      // Calculate new balance_after if actual_return or contribution changed
      let balance_after = updates.balance_after;
      if (updates.actual_return !== undefined || updates.contribution !== undefined) {
        const actual_return = updates.actual_return ?? 0;
        const contribution = updates.contribution ?? 0;
        const actualReturnRate = Number(actual_return) / 100;
        balance_after = (previousBalance + Number(contribution)) * (1 + actualReturnRate);
      }

      const { data, error } = await supabase
        .from("investment_monthly_returns")
        .update({
          ...updates,
          balance_after,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      queryClient.invalidateQueries({ queryKey: ["investment-current-value"] });
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
      queryClient.invalidateQueries({ queryKey: ["investment-current-value"] });
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
