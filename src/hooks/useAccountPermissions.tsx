import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function useAccountPermissions(account?: Account | null) {
  const { user } = useAuth();
  const { members } = useAccountMembers(account?.id);

  const permissions = useMemo(() => {
    if (!account || !user) {
      return {
        isOwner: false,
        canEdit: false,
        canManageMembers: false,
        canDelete: false,
        role: null as "owner" | "editor" | "viewer" | null,
      };
    }

    const isOwner = account.owner_id === user.id;
    
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
      canEdit: isEditor, // Only editors can edit
      canManageMembers: false, // Only owners can manage members
      canDelete: false, // Only owners can delete the account
      role: membership.role as "editor" | "viewer",
    };
  }, [account, user, members]);

  return permissions;
}
