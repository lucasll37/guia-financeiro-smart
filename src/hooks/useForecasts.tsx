import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Forecast = Database["public"]["Tables"]["account_period_forecasts"]["Row"];
type ForecastInsert = Database["public"]["Tables"]["account_period_forecasts"]["Insert"];
type ForecastUpdate = Database["public"]["Tables"]["account_period_forecasts"]["Update"];

export function useForecasts(accountId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forecasts, isLoading } = useQuery({
    queryKey: ["forecasts", accountId],
    queryFn: async () => {
      let query = supabase
        .from("account_period_forecasts")
        .select("*, categories(name, type, color), accounts(name)")
        .order("period_start", { ascending: false });

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const createForecast = useMutation({
    mutationFn: async (forecast: ForecastInsert) => {
      const { data, error } = await supabase
        .from("account_period_forecasts")
        .insert(forecast)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      // Garante que hooks dependentes de despesas previstas (ex.: casa) recarreguem
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });
      toast({
        title: "Previsão criada",
        description: "Sua previsão foi criada com sucesso",
      });
    },
    onError: (error: any) => {
      // Check if it's a unique constraint violation
      if (error.code === '23505' || error.message?.includes('unique_forecast_per_category_period')) {
        toast({
          title: "Previsão já existe",
          description: "Já existe uma previsão para esta subcategoria neste mês. Edite a previsão existente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar previsão",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const updateForecast = useMutation({
    mutationFn: async ({ id, ...updates }: ForecastUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("account_period_forecasts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });
      toast({
        title: "Previsão atualizada",
        description: "Sua previsão foi atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({
          title: "Previsão já existe",
          description: "Já existe outra previsão para esta subcategoria neste mês. Edite a previsão existente ou escolha outra subcategoria/mês.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao atualizar previsão",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const deleteForecast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_period_forecasts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });
      toast({
        title: "Previsão excluída",
        description: "Sua previsão foi excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir previsão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyForecast = useMutation({
    mutationFn: async ({ 
      sourcePeriodStart, 
      targetPeriodStart,
      targetPeriodEnd,
      accountId,
      isCasaAccount
    }: { 
      sourcePeriodStart: string;
      targetPeriodStart: string;
      targetPeriodEnd: string;
      accountId: string;
      isCasaAccount?: boolean;
    }) => {
      console.log("Copiando previsões:", { sourcePeriodStart, targetPeriodStart, accountId, isCasaAccount });
      
      // Buscar TODAS as previsões da conta
      const { data: sourceForecasts, error: fetchError } = await supabase
        .from("account_period_forecasts")
        .select("*, categories(type)")
        .eq("account_id", accountId);

      console.log("Todas previsões da conta:", sourceForecasts);

      if (fetchError) throw fetchError;
      if (!sourceForecasts || sourceForecasts.length === 0) {
        throw new Error("Nenhuma previsão encontrada na conta");
      }

      // Filtrar apenas as do mês de origem (compara apenas YYYY-MM)
      const sourceMonthStart = sourcePeriodStart.substring(0, 7); // "YYYY-MM"
      let forecastsToCopy = sourceForecasts.filter(f => {
        const fMonthStart = f.period_start.substring(0, 7);
        return fMonthStart === sourceMonthStart;
      });

      console.log("Previsões do mês de origem:", forecastsToCopy);

      if (forecastsToCopy.length === 0) {
        throw new Error("Nenhuma previsão encontrada no período de origem (mês " + sourceMonthStart + ")");
      }

      // Filtrar apenas despesas se for conta casa
      if (isCasaAccount) {
        forecastsToCopy = forecastsToCopy.filter(f => (f.categories as any)?.type === "despesa");
        console.log("Após filtrar despesas:", forecastsToCopy);
      }

      if (forecastsToCopy.length === 0) {
        throw new Error(isCasaAccount 
          ? "Nenhuma despesa encontrada no período de origem" 
          : "Nenhuma previsão encontrada no período de origem");
      }

      // Criar novas previsões para o período de destino
      const newForecasts = forecastsToCopy.map(f => ({
        account_id: f.account_id,
        category_id: f.category_id,
        period_start: targetPeriodStart,
        period_end: targetPeriodEnd,
        forecasted_amount: f.forecasted_amount,
        notes: f.notes,
      }));

      console.log("Criando previsões no período de destino:", newForecasts);

      const { data, error } = await supabase
        .from("account_period_forecasts")
        .upsert(newForecasts, { onConflict: "account_id,category_id,period_start" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });
      toast({
        title: "Previsão copiada",
        description: "As previsões foram copiadas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao copiar previsão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    forecasts,
    isLoading,
    createForecast,
    updateForecast,
    deleteForecast,
    copyForecast,
  };
}
