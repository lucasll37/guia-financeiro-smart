import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export function useSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: async ({
      plan,
      billing_cycle,
    }: {
      plan: "plus" | "pro";
      billing_cycle: "monthly" | "annual";
    }) => {
      const { data, error } = await supabase.functions.invoke("stripe-subscribe", {
        body: { plan, billing_cycle },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar assinatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openBillingPortal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-billing-portal");

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao abrir portal de cobrança",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasAccess = (requiredPlan: SubscriptionPlan): boolean => {
    if (!subscription) return false;

    // Check if subscription is active or trialing
    if (!["active", "trialing"].includes(subscription.status)) {
      return false;
    }

    // Check plan hierarchy: pro > plus > free
    const planHierarchy = { free: 0, plus: 1, pro: 2 };
    const userPlanLevel = planHierarchy[subscription.plan];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    return userPlanLevel >= requiredPlanLevel;
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    switch (plan) {
      case "free":
        return {
          accounts: 1,
          transactions: 100,
          categories: true,
          basicCharts: true,
          goals: false,
          notifications: false,
          reports: false,
          exports: false,
          sharedAccounts: false,
          investments: false,
          ai: false,
        };
      case "plus":
        return {
          accounts: 5,
          transactions: "unlimited",
          categories: true,
          basicCharts: true,
          goals: true,
          notifications: true,
          reports: true,
          exports: true,
          sharedAccounts: false,
          investments: false,
          ai: false,
        };
      case "pro":
        return {
          accounts: "unlimited",
          transactions: "unlimited",
          categories: true,
          basicCharts: true,
          goals: true,
          notifications: true,
          reports: true,
          exports: true,
          sharedAccounts: true,
          investments: true,
          ai: true,
        };
    }
  };

  const isTrialing = subscription?.status === "trialing";
  const isCanceled = subscription?.status === "canceled";
  const isExpired = subscription?.status === "expired";

  return {
    subscription,
    isLoading,
    subscribe,
    openBillingPortal,
    hasAccess,
    getPlanFeatures,
    isTrialing,
    isCanceled,
    isExpired,
  };
}
