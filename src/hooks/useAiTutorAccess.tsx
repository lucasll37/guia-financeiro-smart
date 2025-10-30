import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

export function useAiTutorAccess() {
  const { subscription } = useSubscription();

  // Fetch plan limits to check AI tutor access
  const { data: planLimits } = useQuery({
    queryKey: ["plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*");

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Get the current user's plan limit
  const userPlan = subscription?.plan || "free";
  const currentPlanLimit = planLimits?.find(limit => limit.plan === userPlan);

  // Determine if user has access
  const hasAccess = (() => {
    // If plan limits haven't loaded yet, deny access
    if (!currentPlanLimit) return false;

    // Check if the user's plan has AI tutor access
    // and if subscription is active or trialing
    return currentPlanLimit.can_access_ai_tutor && 
           (subscription?.status === "active" || subscription?.status === "trialing");
  })();

  return {
    hasAccess,
    isLoading: !planLimits,
  };
}