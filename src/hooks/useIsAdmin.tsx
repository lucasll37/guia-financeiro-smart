import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useIsAdmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });
};
