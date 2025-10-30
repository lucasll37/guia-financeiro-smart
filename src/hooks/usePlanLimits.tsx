import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export function usePlanLimits() {
  const { subscription } = useSubscription();
  const userPlan = subscription?.plan || "free";

  // Fetch plan limits
  const { data: planLimits } = useQuery({
    queryKey: ["plan-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  // Get limits for current user's plan
  const currentPlanLimits = planLimits?.find(
    (limit) => limit.plan === userPlan
  );

  // Check if user can create more accounts
  const canCreateAccount = async () => {
    if (!currentPlanLimits) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Count user's accounts
    const { count, error } = await supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("deleted_at", null);

    if (error) throw error;

    return (count || 0) < currentPlanLimits.max_accounts;
  };

  // Check if user can create more credit cards for an account
  const canCreateCreditCard = async (accountId: string) => {
    if (!currentPlanLimits) return false;

    // Count credit cards for this account
    const { count, error } = await supabase
      .from("credit_cards")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId);

    if (error) throw error;

    return (count || 0) < currentPlanLimits.max_credit_cards;
  };

  // Check if user can create more investments
  const canCreateInvestment = async () => {
    if (!currentPlanLimits) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Count user's investments
    const { count, error } = await supabase
      .from("investment_assets")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (error) throw error;

    return (count || 0) < currentPlanLimits.max_investments;
  };

  return {
    planLimits,
    currentPlanLimits,
    userPlan,
    canCreateAccount,
    canCreateCreditCard,
    canCreateInvestment,
    maxAccounts: currentPlanLimits?.max_accounts || 1,
    maxCreditCards: currentPlanLimits?.max_credit_cards || 1,
    maxInvestments: currentPlanLimits?.max_investments || 1,
    canEditCategories: currentPlanLimits?.can_edit_categories || false,
    canGenerateReports: currentPlanLimits?.can_generate_reports || false,
    canAccessAiTutor: currentPlanLimits?.can_access_ai_tutor || false,
    canShareAccounts: currentPlanLimits?.can_share_accounts || false,
  };
}
