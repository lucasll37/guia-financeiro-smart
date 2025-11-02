import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SimulationConfig {
  min: number;
  max: number;
  default: number;
  max_slider?: number;
  max_input?: number;
}

export interface SimulationSettings {
  months_config: SimulationConfig;
  monthly_rate_config: SimulationConfig;
  inflation_rate_config: SimulationConfig;
  rate_std_dev_config: SimulationConfig;
  inflation_std_dev_config: SimulationConfig;
  contribution_config: SimulationConfig;
}

export function useInvestmentSimulationSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["investment-simulation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_simulation_settings")
        .select("*");

      if (error) throw error;

      // Converter array de settings em objeto
      const settingsObj: any = {};
      data?.forEach((setting) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });

      return settingsObj as SimulationSettings;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: SimulationConfig;
    }) => {
      const { error } = await supabase
        .from("investment_simulation_settings")
        .update({ 
          setting_value: value as any, 
          updated_at: new Date().toISOString() 
        })
        .eq("setting_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-simulation-settings"] });
      toast.success("Configuração atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
    },
  });

  return {
    settings,
    isLoading,
    updateSetting,
  };
}
