import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useInvestmentMembers } from "@/hooks/useInvestmentMembers";
import { supabase } from "@/integrations/supabase/client";

interface InviteActionsProps {
  inviteId: string; // ID da notificação
  membershipId: string; // ID do registro em account_members ou investment_members
  accountId?: string;
  investmentId?: string;
  invitedBy: string;
  onComplete?: () => void;
}

export function InviteActions({ inviteId, membershipId, accountId, investmentId, invitedBy, onComplete }: InviteActionsProps) {
  const { respondToInvite: respondToAccountInvite } = useAccountMembers();
  const { updateMemberStatus: respondToInvestmentInvite } = useInvestmentMembers();

  const handleResponse = async (status: "accepted" | "rejected") => {
    console.log("Respondendo ao convite:", { inviteId, membershipId, status, investmentId, accountId });
    
    try {
      if (investmentId) {
        // Responder a convite de investimento
        console.log("Atualizando investment_members...");
        await respondToInvestmentInvite.mutateAsync({
          id: membershipId,
          status: status === "accepted" ? "accepted" : "declined",
        });
      } else if (accountId) {
        // Responder a convite de conta
        console.log("Atualizando account_members...");
        await respondToAccountInvite.mutateAsync({
          id: membershipId,
          status,
          accountId,
          invitedBy,
        });
      }
      
      console.log("Convite processado com sucesso");
      onComplete?.();
    } catch (error) {
      console.error("Erro ao responder convite:", error);
      throw error;
    }
  };

  const isLoading = respondToAccountInvite.isPending || respondToInvestmentInvite.isPending;

  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => handleResponse("accepted")}
        disabled={isLoading}
      >
        <Check className="h-3 w-3 mr-1" />
        Aceitar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleResponse("rejected")}
        disabled={isLoading}
      >
        <X className="h-3 w-3 mr-1" />
        Recusar
      </Button>
    </div>
  );
}
