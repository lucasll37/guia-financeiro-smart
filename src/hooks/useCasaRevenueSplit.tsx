import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  user_id: string;
  name: string;
  email: string;
  weight: number;
}

export function useCasaRevenueSplit(accountId?: string, periodStart?: string) {
  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  // Usar mês atual se não especificado
  const currentPeriod = periodStart || new Date().toISOString().slice(0, 7) + "-01";

  const { data: members } = useQuery({
    queryKey: ["casa-members", accountId, currentPeriod],
    queryFn: async () => {
      if (!accountId || !account) return [];

      // Buscar splits do período da nova tabela casa_revenue_splits
      const { data: splits, error: splitsError } = await supabase
        .from("casa_revenue_splits")
        .select("user_id, weight, profiles(id, name, email)")
        .eq("account_id", accountId)
        .eq("period_start", currentPeriod);

      if (splitsError) throw splitsError;

      // Mapear para estrutura Member
      const allMembers: Member[] = (splits || []).map((s: any) => ({
        user_id: s.user_id,
        name: s.profiles?.name || s.profiles?.email || "Sem nome",
        email: s.profiles?.email || "",
        weight: s.weight,
      }));

      return allMembers;
    },
    enabled: !!accountId && !!account,
  });

  const calculateSplit = (totalExpenses: number) => {
    if (!members || members.length === 0) return [];

    const totalWeight = members.reduce((sum, m) => sum + m.weight, 0);
    
    return members.map((member) => ({
      ...member,
      amount: (totalExpenses * member.weight) / totalWeight,
      percentage: (member.weight / totalWeight) * 100,
    }));
  };

  const isCasaAccount = account?.type === "casa";

  return {
    account,
    members: members || [],
    calculateSplit,
    isCasaAccount,
  };
}
