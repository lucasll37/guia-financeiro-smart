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
      if (!accountId || !account) {
        console.log("useCasaRevenueSplit: Missing accountId or account", { accountId, account });
        return [];
      }
      
      console.log("useCasaRevenueSplit: Starting fetch for account", { 
        accountId, 
        ownerId: account.owner_id,
        revenueSplit: account.revenue_split 
      });
      
      const allMembers: Member[] = [];
      
      // Buscar proprietário
      if (account.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .eq("id", account.owner_id)
          .maybeSingle();

        console.log("useCasaRevenueSplit: Owner query result", { ownerData, ownerError });

        if (ownerData) {
          const weight = (account.revenue_split as any)?.[ownerData.id] || 1;
          allMembers.push({
            user_id: ownerData.id,
            name: ownerData.name || ownerData.email || "Sem nome",
            email: ownerData.email || "",
            weight,
          });
        }
      }

      // Buscar membros editores aceitos
      const { data: memberData, error: memberError } = await supabase
        .from("account_members")
        .select(`
          user_id,
          profiles!inner(name, email)
        `)
        .eq("account_id", accountId)
        .eq("status", "accepted")
        .eq("role", "editor");

      console.log("useCasaRevenueSplit: Members query result", { memberData, memberError });

      if (memberData && memberData.length > 0) {
        memberData.forEach((m: any) => {
          const weight = (account.revenue_split as any)?.[m.user_id] || 1;
          allMembers.push({
            user_id: m.user_id,
            name: m.profiles.name || m.profiles.email || "Sem nome",
            email: m.profiles.email || "",
            weight,
          });
        });
      }

      console.log("useCasaRevenueSplit: Final members list", { allMembers, count: allMembers.length });
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
