import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AccountMember = Database["public"]["Tables"]["account_members"]["Row"];
type AccountMemberInsert = Database["public"]["Tables"]["account_members"]["Insert"];
type AccountMemberUpdate = Database["public"]["Tables"]["account_members"]["Update"];

export function useAccountMembers(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["account_members", accountId],
    queryFn: async () => {
      let query = supabase
        .from("account_members")
        .select("*, user:profiles!account_members_user_id_fkey(name, email, avatar_url)");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("created_at");

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const inviteMember = useMutation({
    mutationFn: async (member: AccountMemberInsert) => {
      const { data, error } = await supabase
        .from("account_members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account_members"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Convite enviado",
        description: "O convite foi enviado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AccountMemberUpdate["role"] }) => {
      const { data, error } = await supabase
        .from("account_members")
        .update({ role })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account_members"] });
      toast({
        title: "Papel atualizado",
        description: "O papel do membro foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar papel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const respondToInvite = useMutation({
    mutationFn: async ({ id, status, accountId, invitedBy }: { 
      id: string; 
      status: "accepted" | "rejected";
      accountId: string;
      invitedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("account_members")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account_members"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: variables.status === "accepted" ? "Convite aceito" : "Convite recusado",
        description: `Você ${variables.status === "accepted" ? "aceitou" : "recusou"} o convite`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao responder convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account_members"] });
      toast({
        title: "Membro removido",
        description: "O membro foi removido da conta",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    members,
    isLoading,
    inviteMember,
    updateMemberRole,
    respondToInvite,
    removeMember,
  };
}
