import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Mail, Trash2 } from "lucide-react";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  currentUserId: string;
}

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  editor: "Editor",
  viewer: "Visualizador",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Recusado",
};

export function MembersDialog({ open, onOpenChange, account, currentUserId }: MembersDialogProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");

  const { members, isLoading, inviteMember, updateMemberRole, removeMember } = useAccountMembers(account?.id);
  const { logAction } = useAuditLogs();

  const handleInvite = async () => {
    if (!account || (!inviteEmail && !inviteUserId)) return;

    // Para simplificar, vamos assumir que o user_id é fornecido
    // Em produção, você buscaria o usuário pelo email
    const userId = inviteUserId || inviteEmail;

    await inviteMember.mutateAsync({
      account_id: account.id,
      user_id: userId,
      role: inviteRole,
      invited_by: currentUserId,
      status: "pending",
    });

    logAction.mutate({
      entity: "account_members",
      entity_id: account.id,
      action: "create",
      diff: { role: inviteRole, invited_user: userId } as any,
    });

    setInviteEmail("");
    setInviteUserId("");
    setInviteRole("viewer");
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!account) return;

    await removeMember.mutateAsync(memberId);
    
    logAction.mutate({
      entity: "account_members",
      entity_id: account.id,
      action: "delete",
      diff: { member_id: memberId } as any,
    });
  };

  const handleUpdateRole = async (memberId: string, newRole: "owner" | "editor" | "viewer") => {
    if (!account) return;

    await updateMemberRole.mutateAsync({ id: memberId, role: newRole });
    
    logAction.mutate({
      entity: "account_members",
      entity_id: account.id,
      action: "update",
      diff: { member_id: memberId, new_role: newRole } as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros - {account?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Section */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar Novo Membro
            </h3>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <div className="flex gap-2">
                  <Mail className="h-5 w-5 mt-2 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">ou</div>

              <div className="space-y-2">
                <Label htmlFor="invite-userid">ID do Usuário</Label>
                <Input
                  id="invite-userid"
                  placeholder="UUID do usuário"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Papel</Label>
                <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleInvite}
                disabled={(!inviteEmail && !inviteUserId) || inviteMember.isPending}
                className="w-full"
              >
                Enviar Convite
              </Button>
            </div>
          </div>

          <Separator />

          {/* Members List */}
          <div className="space-y-4">
            <h3 className="font-medium">Membros Atuais</h3>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {(member.user as any)?.name || "Usuário"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(member.user as any)?.email || member.user_id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={member.status === "accepted" ? "default" : "secondary"}>
                        {statusLabels[member.status]}
                      </Badge>

                      <Select
                        value={member.role}
                        onValueChange={(value: any) => handleUpdateRole(member.id, value)}
                        disabled={member.role === "owner"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Proprietário</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>

                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum membro adicional</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
