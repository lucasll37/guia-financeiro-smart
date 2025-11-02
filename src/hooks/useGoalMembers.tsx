import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GoalMemberRow = Database["public"]["Tables"]["goal_members"]["Row"];

export interface GoalMember extends GoalMemberRow {
  user?: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const useGoalMembers = (goalId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["goal_members", goalId],
    queryFn: async () => {
      if (!goalId) return [];

      const { data, error } = await supabase
        .from("goal_members")
        .select("*, user:profiles!goal_members_user_id_fkey(name, email, avatar_url)")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GoalMember[];
    },
    enabled: !!goalId,
  });

  const addMember = useMutation({
    mutationFn: async ({
      goalId,
      userEmail,
      role,
    }: {
      goalId: string;
      userEmail: string;
      role: "viewer" | "editor";
    }) => {
      // Buscar user_id pelo email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", userEmail)
        .single();

      if (profileError || !profile) {
        throw new Error("Usuário não encontrado com este email");
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Você precisa estar autenticado");
      }

      const { error } = await supabase.from("goal_members").insert({
        goal_id: goalId,
        user_id: profile.id,
        invited_by: session.session.user.id,
        role,
        status: "accepted", // Auto-aceitar convite
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este usuário já é membro desta meta");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal_members", goalId] });
      toast.success("Membro adicionado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "viewer" | "editor";
    }) => {
      const { error } = await supabase
        .from("goal_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal_members", goalId] });
      toast.success("Permissão atualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar permissão");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("goal_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal_members", goalId] });
      toast.success("Membro removido");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  const leaveMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("goal_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal_members", goalId] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Você saiu da meta compartilhada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao sair da meta");
    },
  });

  return {
    members,
    isLoading,
    addMember,
    updateMemberRole,
    removeMember,
    leaveMember,
  };
};
