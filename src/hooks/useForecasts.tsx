import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Forecast = Database["public"]["Tables"]["account_period_forecasts"]["Row"];
type ForecastInsert = Database["public"]["Tables"]["account_period_forecasts"]["Insert"];
type ForecastUpdate = Database["public"]["Tables"]["account_period_forecasts"]["Update"];

export function useForecasts(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: forecasts, isLoading } = useQuery({
    queryKey: ["forecasts", accountId],
    queryFn: async () => {
      let query = supabase
        .from("account_period_forecasts")
        .select("*, categories(name, type, color)")
        .order("period_start", { ascending: false });

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
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
      toast({
        title: "Previsão criada",
        description: "Sua previsão foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar previsão",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Previsão atualizada",
        description: "Sua previsão foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar previsão",
        description: error.message,
        variant: "destructive",
      });
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
      accountId 
    }: { 
      sourcePeriodStart: string;
      targetPeriodStart: string;
      targetPeriodEnd: string;
      accountId: string;
    }) => {
      // Buscar previsões do período de origem
      const { data: sourceForecasts, error: fetchError } = await supabase
        .from("account_period_forecasts")
        .select("*")
        .eq("account_id", accountId)
        .eq("period_start", sourcePeriodStart);

      if (fetchError) throw fetchError;
      if (!sourceForecasts || sourceForecasts.length === 0) {
        throw new Error("Nenhuma previsão encontrada no período de origem");
      }

      // Criar novas previsões para o período de destino
      const newForecasts = sourceForecasts.map(f => ({
        account_id: f.account_id,
        category_id: f.category_id,
        period_start: targetPeriodStart,
        period_end: targetPeriodEnd,
        forecasted_amount: f.forecasted_amount,
        notes: f.notes,
      }));

      const { data, error } = await supabase
        .from("account_period_forecasts")
        .upsert(newForecasts, { onConflict: "account_id,category_id,period_start" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
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
