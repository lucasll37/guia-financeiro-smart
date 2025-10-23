import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useAccountMembers } from "@/hooks/useAccountMembers";

interface InviteActionsProps {
  inviteId: string;
  accountId: string;
  invitedBy: string;
  onComplete?: () => void;
}

export function InviteActions({ inviteId, accountId, invitedBy, onComplete }: InviteActionsProps) {
  const { respondToInvite } = useAccountMembers();

  const handleResponse = async (status: "accepted" | "rejected") => {
    await respondToInvite.mutateAsync({
      id: inviteId,
      status,
      accountId,
      invitedBy,
    });
    onComplete?.();
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => handleResponse("accepted")}
        disabled={respondToInvite.isPending}
      >
        <Check className="h-3 w-3 mr-1" />
        Aceitar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleResponse("rejected")}
        disabled={respondToInvite.isPending}
      >
        <X className="h-3 w-3 mr-1" />
        Recusar
      </Button>
    </div>
  );
}
