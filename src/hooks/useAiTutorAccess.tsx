import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

export function useAiTutorAccess() {
  const { subscription } = useSubscription();

  // Fetch AI tutor settings
  const { data: settings } = useQuery({
    queryKey: ["ai-tutor-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "ai_tutor_requires_pro")
        .single();

      if (error) {
        console.error("Error fetching AI tutor settings:", error);
        // Default to free access if setting not found
        return { requiresPro: false };
      }
      
      const enabled = (data.setting_value as any)?.enabled || false;
      return { requiresPro: enabled };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Determine if user has access
  const hasAccess = (() => {
    // If settings haven't loaded yet, deny access
    if (!settings) return false;

    // If AI tutor doesn't require pro, everyone has access
    if (!settings.requiresPro) return true;

    // If it requires pro, check if user has pro plan
    return subscription?.plan === "pro" && 
           (subscription?.status === "active" || subscription?.status === "trialing");
  })();

  return {
    hasAccess,
    requiresPro: settings?.requiresPro || false,
    isLoading: !settings,
  };
}