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

      // Buscar membros editores aceitos da conta
      const { data: accountMembers, error: membersError } = await supabase
        .from("account_members")
        .select("user_id, role, status")
        .eq("account_id", accountId)
        .eq("status", "accepted")
        .eq("role", "editor");

      if (membersError) throw membersError;

      // Participantes pagantes = dono + membros editores aceitos
      const editorIds = accountMembers?.map(m => m.user_id) || [];
      const payingUserIds = Array.from(
        new Set([
          ...(account.owner_id ? [account.owner_id] : []),
          ...editorIds,
        ])
      );

      if (payingUserIds.length === 0) return [];

      // Buscar perfis dos usuários pagantes
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", payingUserIds);

      if (error) throw error;

      // Mapear para estrutura Member usando peso do revenue_split (default 1)
      const split = (account.revenue_split as Record<string, number>) || {};
      const allMembers: Member[] = (profiles || []).map((p: any) => ({
        user_id: p.id,
        name: p.name || p.email || "Sem nome",
        email: p.email || "",
        weight: split[p.id] ?? 1,
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
