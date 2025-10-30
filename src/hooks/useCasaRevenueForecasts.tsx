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

  // Buscar categoria de receita principal
  const revenueCategory = categories?.find(
    (c) => c.type === "receita" && c.parent_id === null
  );

  // Buscar subcategorias de receita (uma para cada membro)
  const revenueSubcategories = categories?.filter(
    (c) => c.type === "receita" && c.parent_id === revenueCategory?.id
  ) || [];

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
      if (!isCasaAccount || !expenseForecasts || members.length === 0 || !revenueCategory) return;
      if (revenueSubcategories.length === 0) {
        console.warn("Nenhuma subcategoria de receita encontrada para esta conta casa");
        return;
      }

      const totalExpenses = expenseForecasts.reduce(
        (sum, f) => sum + Number(f.forecasted_amount),
        0
      );

      const splits = calculateSplit(totalExpenses);
      const monthDate = new Date(selectedMonth + "-01");
      const periodStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

      // Mapear cada membro para sua subcategoria correspondente
      const forecastsToUpsert = splits
        .map((split) => {
          // Buscar subcategoria que contém o email do membro
          const subcategory = revenueSubcategories.find((cat) => 
            cat.name.toLowerCase().includes(split.email.toLowerCase())
          );

          if (!subcategory) {
            console.warn(`Subcategoria não encontrada para ${split.email}`);
            return null;
          }

          return {
            account_id: accountId,
            category_id: subcategory.id,
            period_start: periodStart,
            period_end: periodEnd,
            forecasted_amount: split.amount,
            notes: `Contribuição: ${split.percentage.toFixed(1)}% (peso ${split.weight})`,
          };
        })
        .filter((f) => f !== null);

      if (forecastsToUpsert.length === 0) {
        console.warn("Nenhuma previsão pôde ser mapeada para as subcategorias existentes");
        return;
      }

      // Deletar previsões antigas de receita para este mês (apenas das subcategorias de receita)
      await supabase
        .from("account_period_forecasts")
        .delete()
        .eq("account_id", accountId)
        .in("category_id", revenueSubcategories.map(c => c.id))
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
    if (isCasaAccount && expenseForecasts && members.length > 0 && revenueCategory && revenueSubcategories.length > 0) {
      syncRevenueForecasts.mutate();
    }
  }, [isCasaAccount, expenseForecasts, members.length, selectedMonth, revenueSubcategories.length]);

  return {
    syncRevenueForecasts,
    isSync: syncRevenueForecasts.isPending,
  };
}
