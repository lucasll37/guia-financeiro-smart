import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useInvestmentMembers } from "@/hooks/useInvestmentMembers";

interface InviteActionsProps {
  inviteId: string;
  accountId?: string;
  investmentId?: string;
  invitedBy: string;
  onComplete?: () => void;
}

export function InviteActions({ inviteId, accountId, investmentId, invitedBy, onComplete }: InviteActionsProps) {
  const { respondToInvite: respondToAccountInvite } = useAccountMembers();
  const { updateMemberStatus: respondToInvestmentInvite } = useInvestmentMembers();

  const handleResponse = async (status: "accepted" | "rejected") => {
    if (investmentId) {
      // Responder a convite de investimento
      await respondToInvestmentInvite.mutateAsync({
        id: inviteId,
        status: status === "accepted" ? "accepted" : "declined",
      });
    } else if (accountId) {
      // Responder a convite de conta
      await respondToAccountInvite.mutateAsync({
        id: inviteId,
        status,
        accountId,
        invitedBy,
      });
    }
    onComplete?.();
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
