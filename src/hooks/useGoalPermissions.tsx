import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useGoalPermissions = (goalId: string | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: ["goal_permissions", goalId],
    queryFn: async () => {
      if (!goalId) return { isOwner: false, canEdit: false, canView: false, role: null };

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        return { isOwner: false, canEdit: false, canView: false, role: null };
      }

      const userId = session.session.user.id;

      // Verificar se é owner
      const { data: goal } = await supabase
        .from("goals")
        .select("user_id")
        .eq("id", goalId)
        .single();

      const isOwner = goal?.user_id === userId;

      // Verificar membership
      const { data: membership } = await supabase
        .from("goal_members")
        .select("role, status")
        .eq("goal_id", goalId)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .single();

      const role = membership?.role || null;
      const canEdit = isOwner || role === "editor";
      const canView = isOwner || !!membership;

      return { isOwner, canEdit, canView, role };
    },
    enabled: !!goalId,
  });

  return {
    isOwner: data?.isOwner ?? false,
    canEdit: data?.canEdit ?? false,
    canView: data?.canView ?? false,
    role: data?.role ?? null,
    isLoading,
  };
};
