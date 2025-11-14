import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAppSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");

      if (error) throw error;
      
      // Convert array to object for easier access
      const settingsMap: Record<string, any> = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting;
      });
      
      return settingsMap;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          value, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({
        title: "Configuração atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSetting,
    version: settings?.software_version?.value || "1.0.0",
    accountGuideText: settings?.account_guide_text?.value || "",
    investmentGuideText: settings?.investment_guide_text?.value || "",
    goalGuideText: settings?.goal_guide_text?.value || "",
    aiTutorTutorialText: settings?.ai_tutor_tutorial_text 
      ? (typeof settings.ai_tutor_tutorial_text.value === 'string' 
          ? JSON.parse(settings.ai_tutor_tutorial_text.value).text 
          : settings.ai_tutor_tutorial_text.value.text)
      : "",
    aiTutorEnabled: settings?.ai_tutor_enabled
      ? (typeof settings.ai_tutor_enabled.value === 'string'
          ? JSON.parse(settings.ai_tutor_enabled.value).enabled
          : settings.ai_tutor_enabled.value.enabled)
      : false,
    tutorialVideoUrl: settings?.tutorial_video_url?.value || "",
  };
};
