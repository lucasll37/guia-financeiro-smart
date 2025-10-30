import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAccountEditPermissions(accountId?: string) {
  return useQuery({
    queryKey: ["account-edit-permissions", accountId],
    queryFn: async () => {
      if (!accountId) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user is owner
      const { data: account } = await supabase
        .from("accounts")
        .select("owner_id")
        .eq("id", accountId)
        .maybeSingle();

      if (account?.owner_id === user.id) {
        return true;
      }

      // Check if user is an editor member
      const { data: membership } = await supabase
        .from("account_members")
        .select("role")
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      return membership?.role === "editor";
    },
    enabled: !!accountId,
  });
}
