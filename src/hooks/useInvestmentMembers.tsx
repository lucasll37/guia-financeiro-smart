import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type InvestmentMember = Database["public"]["Tables"]["investment_members"]["Row"];
type InvestmentMemberInsert = Database["public"]["Tables"]["investment_members"]["Insert"];

export function useInvestmentMembers(investmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["investment-members", investmentId],
    queryFn: async () => {
      if (!investmentId) return [];

      const { data, error } = await supabase
        .from("investment_members")
        .select("*")
        .eq("investment_id", investmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each member
      if (!data || data.length === 0) return [];

      const userIds = data.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge members with profiles
      return data.map((member) => ({
        ...member,
        profiles: profiles?.find((p) => p.id === member.user_id) || null,
      }));
    },
    enabled: !!investmentId,
  });

  const inviteMember = useMutation({
    mutationFn: async (data: InvestmentMemberInsert) => {
      const { error } = await supabase.from("investment_members").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      toast({
        title: "Convite enviado",
        description: "O usuário foi convidado para o investimento",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("investment_members")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      toast({
        title: "Status atualizado",
        description: "O status do membro foi atualizado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investment_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      toast({
        title: "Membro removido",
        description: "O membro foi removido do investimento",
      });
    },
    onError: (error: any) => {
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
    updateMemberStatus,
    removeMember,
  };
}
