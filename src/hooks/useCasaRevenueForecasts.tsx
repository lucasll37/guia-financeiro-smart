import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCasaRevenueSplit } from "./useCasaRevenueSplit";
import { useCategories } from "./useCategories";
import { format, startOfMonth, endOfMonth } from "date-fns";

/**
 * Hook que gerencia automaticamente as previsões de receita para contas tipo "casa"
 * Cria/atualiza previsões baseadas no revenue_split e no total de despesas
 */
export function useCasaRevenueForecasts(accountId: string, selectedMonth: string) {
  const queryClient = useQueryClient();
  const { calculateSplit, isCasaAccount, members } = useCasaRevenueSplit(accountId);
  const { categories } = useCategories(accountId);

  // Buscar categoria de receita principal (ou criar se não existir)
  const revenueCategory = categories?.find(
    (c) => c.type === "receita" && c.name.toLowerCase().includes("contribuição")
  );

  // Buscar previsões de despesas do mês
  const { data: expenseForecasts } = useQuery({
    queryKey: ["expense-forecasts", accountId, selectedMonth],
    queryFn: async () => {
      const monthDate = new Date(selectedMonth + "-01");
      const periodStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("account_period_forecasts")
        .select("*, categories!inner(type)")
        .eq("account_id", accountId)
        .eq("period_start", periodStart)
        .eq("categories.type", "despesa");

      if (error) throw error;
      return data;
    },
    enabled: !!accountId && !!selectedMonth && isCasaAccount,
  });

  // Mutation para sincronizar previsões de receita
  const syncRevenueForecasts = useMutation({
    mutationFn: async () => {
      if (!isCasaAccount || !expenseForecasts || members.length === 0) return;

      const totalExpenses = expenseForecasts.reduce(
        (sum, f) => sum + Number(f.forecasted_amount),
        0
      );

      const splits = calculateSplit(totalExpenses);
      const monthDate = new Date(selectedMonth + "-01");
      const periodStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

      // Buscar ou criar categoria de receita para contribuições
      let categoryId = revenueCategory?.id;
      
      if (!categoryId) {
        const { data: newCategory, error: catError } = await supabase
          .from("categories")
          .insert({
            name: "Contribuição Casa",
            type: "receita",
            color: "#10b981",
            account_id: accountId,
          })
          .select()
          .single();

        if (catError) throw catError;
        categoryId = newCategory.id;
      }

      // Criar/atualizar previsões de receita para cada membro
      const forecastsToUpsert = splits.map((split) => ({
        account_id: accountId,
        category_id: categoryId,
        period_start: periodStart,
        period_end: periodEnd,
        forecasted_amount: split.amount,
        notes: `Contribuição de ${split.name} (${split.percentage.toFixed(1)}% - peso ${split.weight})`,
      }));

      // Deletar previsões antigas de receita para este mês (apenas da categoria de contribuição)
      await supabase
        .from("account_period_forecasts")
        .delete()
        .eq("account_id", accountId)
        .eq("category_id", categoryId)
        .eq("period_start", periodStart);

      // Inserir novas previsões
      const { error: insertError } = await supabase
        .from("account_period_forecasts")
        .insert(forecastsToUpsert);

      if (insertError) throw insertError;

      return forecastsToUpsert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });
    },
  });

  // Auto-sincronizar quando despesas ou splits mudarem
  useEffect(() => {
    if (isCasaAccount && expenseForecasts && members.length > 0) {
      syncRevenueForecasts.mutate();
    }
  }, [isCasaAccount, expenseForecasts, members.length, selectedMonth]);

  return {
    syncRevenueForecasts,
    isSync: syncRevenueForecasts.isPending,
  };
}
