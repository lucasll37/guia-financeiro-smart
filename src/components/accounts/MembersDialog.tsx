import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Mail, Trash2, Crown } from "lucide-react";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);

  const { members, isLoading, inviteMember, updateMemberRole, removeMember } = useAccountMembers(account?.id);
  const { logAction } = useAuditLogs();
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!account || !inviteEmail) return;

    setIsInviting(true);
    try {
      // Buscar usuário pelo email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .ilike("email", inviteEmail)
        .limit(1);

      if (profileError) throw profileError;
      
      if (!profiles || profiles.length === 0) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi possível encontrar um usuário com este email",
          variant: "destructive",
        });
        return;
      }

      const profile = profiles[0];

      // Criar convite
      const newMember = await inviteMember.mutateAsync({
        account_id: account.id,
        user_id: profile.id,
        role: inviteRole,
        invited_by: currentUserId,
        status: "pending",
      });

      // Criar notificação para o usuário convidado
      await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "invite",
        message: `Você foi convidado para participar da conta "${account.name}"`,
        metadata: {
          invite_id: newMember.id,
          account_id: account.id,
          account_name: account.name,
          invited_by: currentUserId,
          role: inviteRole,
        },
      });

      logAction.mutate({
        entity: "account_members",
        entity_id: account.id,
        action: "create",
        diff: { role: inviteRole, invited_user: profile.id } as any,
      });

      setInviteEmail("");
      setInviteRole("viewer");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
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

  const handleTransferOwnership = async (newOwnerId: string, memberName: string) => {
    if (!account) return;

    if (!confirm(`Tem certeza que deseja transferir a propriedade da conta para ${memberName}?`)) return;

    try {
      // Atualizar o dono da conta
      const { error: accountError } = await supabase
        .from("accounts")
        .update({ owner_id: newOwnerId })
        .eq("id", account.id);

      if (accountError) throw accountError;

      // Criar notificação para o novo dono
      await supabase.from("notifications").insert({
        user_id: newOwnerId,
        type: "invite",
        message: `Você agora é o proprietário da conta "${account.name}"`,
        metadata: {
          account_id: account.id,
          account_name: account.name,
          transferred_by: currentUserId,
        },
      });

      // Criar notificação para o antigo dono confirmando transferência
      await supabase.from("notifications").insert({
        user_id: currentUserId,
        type: "system",
        message: `Você transferiu a propriedade da conta "${account.name}" para ${memberName}`,
        metadata: {
          account_id: account.id,
          account_name: account.name,
          new_owner: newOwnerId,
        },
      });

      toast({
        title: "Propriedade transferida",
        description: "A propriedade da conta foi transferida com sucesso",
      });

      logAction.mutate({
        entity: "accounts",
        entity_id: account.id,
        action: "update",
        diff: { transferred_to: newOwnerId } as any,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao transferir propriedade",
        description: error.message,
        variant: "destructive",
      });
    }
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
                <Label htmlFor="invite-email">E-mail do Usuário</Label>
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
                <p className="text-xs text-muted-foreground">
                  Insira o e-mail do usuário que deseja convidar
                </p>
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
                disabled={!inviteEmail || isInviting}
                className="w-full"
              >
                {isInviting ? "Enviando..." : "Enviar Convite"}
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

                      {account?.owner_id === currentUserId && member.status === "accepted" && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value: any) => handleUpdateRole(member.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            size="icon"
                            title="Transferir propriedade"
                            onClick={() => handleTransferOwnership(member.user_id, (member.user as any)?.name || "Usuário")}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {account?.owner_id !== currentUserId && (
                        <Badge variant="outline">{roleLabels[member.role]}</Badge>
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
