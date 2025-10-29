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
      const payload = { ...data, status: "accepted" as any };
      const { error } = await supabase.from("investment_members").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast({
        title: "Acesso concedido",
        description: "O usuário agora tem acesso a este investimento",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao conceder acesso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      console.log("Atualizando status do membro:", { id, status });
      
      // Se for recusar, deletar o registro ao invés de atualizar
      if (status === "declined") {
        const { error } = await supabase
          .from("investment_members")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Erro ao deletar membro:", error);
          throw error;
        }
        
        console.log("Convite recusado e registro deletado");
        return { id, status: "declined" };
      }
      
      // Se for aceitar, atualizar o status
      const { data, error } = await supabase
        .from("investment_members")
        .update({ status: "accepted" })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
      }
      
      console.log("Membro atualizado:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
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
      // Get member info before deleting to update notification
      const { data: member } = await supabase
        .from("investment_members")
        .select("user_id, status")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase
        .from("investment_members")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // If member was pending, invalidate their notification
      if (member?.status === "pending") {
        await supabase
          .from("notifications")
          .update({ 
            metadata: { 
              ...{} as any,
              invite_cancelled: true,
              cancelled_at: new Date().toISOString()
            } 
          })
          .eq("type", "invite")
          .eq("user_id", member.user_id)
          .contains("metadata", { invite_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-members"] });
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
