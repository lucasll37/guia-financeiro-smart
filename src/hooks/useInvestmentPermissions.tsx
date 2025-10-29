import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInvestmentMembers } from "@/hooks/useInvestmentMembers";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

export function useInvestmentPermissions(investment?: Investment | null) {
  const { user } = useAuth();
  const { members } = useInvestmentMembers(investment?.id);

  const permissions = useMemo(() => {
    if (!investment || !user) {
      return {
        isOwner: false,
        canEdit: false,
        canManageMembers: false,
        canDelete: false,
        role: null as "owner" | "editor" | "viewer" | null,
      };
    }

    const isOwner = investment.owner_id === user.id;
    
    if (isOwner) {
      return {
        isOwner: true,
        canEdit: true,
        canManageMembers: true,
        canDelete: true,
        role: "owner" as const,
      };
    }

    // Check if user is a member and get their role
    const membership = members?.find((m) => m.user_id === user.id && m.status === "accepted");
    
    if (!membership) {
      return {
        isOwner: false,
        canEdit: false,
        canManageMembers: false,
        canDelete: false,
        role: null,
      };
    }

    const isEditor = membership.role === "editor";

    return {
      isOwner: false,
      canEdit: isEditor, // Only editors can edit returns/projections
      canManageMembers: false, // Only owners can manage members
      canDelete: false, // Only owners can delete the investment
      role: membership.role as "editor" | "viewer",
    };
  }, [investment, user, members]);

  return permissions;
}
