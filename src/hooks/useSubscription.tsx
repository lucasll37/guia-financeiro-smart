import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: "Gratuito",
      plus: "Plus",
      pro: "Pro",
    };
    return labels[plan] || plan;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Ativa",
      canceled: "Cancelada",
      past_due: "Pagamento Pendente",
      trialing: "Período de Teste",
    };
    return labels[status] || status;
  };

  return {
    subscription,
    isLoading,
    getPlanLabel,
    getStatusLabel,
  };
}
