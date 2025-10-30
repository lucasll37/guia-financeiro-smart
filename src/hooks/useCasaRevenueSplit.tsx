import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  user_id: string;
  name: string;
  email: string;
  weight: number;
}

export function useCasaRevenueSplit(accountId?: string) {
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

  const { data: members } = useQuery({
    queryKey: ["casa-members", accountId, account?.revenue_split],
    queryFn: async () => {
      if (!accountId || !account) return [];

      // Participantes do rateio = dono + chaves do revenue_split
      const split = (account.revenue_split as Record<string, number>) || {};
      const uniqueIds = Array.from(
        new Set([
          ...(account.owner_id ? [account.owner_id] : []),
          ...Object.keys(split),
        ])
      );

      if (uniqueIds.length === 0) return [];

      // Buscar perfis de todos participantes de uma vez
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", uniqueIds);

      if (error) throw error;

      // Mapear para estrutura Member usando peso do revenue_split (default 1)
      const allMembers: Member[] = (profiles || []).map((p: any) => ({
        user_id: p.id,
        name: p.name || p.email || "Sem nome",
        email: p.email || "",
        weight: split[p.id] ?? 1,
      }));

      // Garantir que o dono aparece mesmo que não venha do select (por segurança)
      if (account.owner_id && !allMembers.find(m => m.user_id === account.owner_id)) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("id, name, email")
          .eq("id", account.owner_id)
          .maybeSingle();
        if (ownerData) {
          allMembers.unshift({
            user_id: ownerData.id,
            name: ownerData.name || ownerData.email || "Sem nome",
            email: ownerData.email || "",
            weight: split[ownerData.id] ?? 1,
          });
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
