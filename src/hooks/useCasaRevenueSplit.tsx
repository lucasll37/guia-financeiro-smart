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

      // 1) Buscar splits do período atual
      const { data: splits, error: splitsError } = await supabase
        .from("casa_revenue_splits")
        .select("user_id, weight")
        .eq("account_id", accountId)
        .eq("period_start", currentPeriod);

      if (splitsError) throw splitsError;

      let allMembers: Member[] = [];

      if (splits && splits.length > 0) {
        // Enriquecer com perfis em uma única consulta
        const userIds = splits.map((s: any) => s.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        allMembers = splits.map((s: any) => {
          const p = profilesData?.find((pr: any) => pr.id === s.user_id);
          return {
            user_id: s.user_id,
            name: p?.name || p?.email || "Sem nome",
            email: p?.email || "",
            weight: Number(s.weight) || 1,
          } as Member;
        });
      } else {
        // 2) Fallback: usar accounts.revenue_split (JSON) se existir
        const revSplit = (account as any).revenue_split || {};
        const entries = Object.entries(revSplit as Record<string, number>);
        if (entries.length > 0) {
          const userIds = entries.map(([uid]) => uid);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          allMembers = entries.map(([uid, w]) => {
            const p = profilesData?.find((pr: any) => pr.id === uid);
            return {
              user_id: uid,
              name: p?.name || p?.email || "Sem nome",
              email: p?.email || "",
              weight: Number(w) || 1,
            } as Member;
          });
        } else {
          // 3) Fallback: membros editores aceitos da conta, pesos iguais
          const { data: am } = await supabase
            .from("account_members")
            .select("user_id, role, status")
            .eq("account_id", accountId)
            .eq("role", "editor")
            .eq("status", "accepted");

          const userIds = (am || []).map((m: any) => m.user_id);
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("id, name, email")
              .in("id", userIds);

            allMembers = userIds.map((uid: string) => {
              const p = profilesData?.find((pr: any) => pr.id === uid);
              return {
                user_id: uid,
                name: p?.name || p?.email || "Sem nome",
                email: p?.email || "",
                weight: 1,
              } as Member;
            });
          }
        }
      }

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
