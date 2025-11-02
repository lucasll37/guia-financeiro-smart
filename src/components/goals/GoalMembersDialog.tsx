import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { useGoalMembers } from "@/hooks/useGoalMembers";
import { useGoalPermissions } from "@/hooks/useGoalPermissions";
import { Skeleton } from "@/components/ui/skeleton";

interface GoalMembersDialogProps {
  goalId: string | undefined;
  goalName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalMembersDialog({
  goalId,
  goalName,
  open,
  onOpenChange,
}: GoalMembersDialogProps) {
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"viewer" | "editor">("viewer");
  
  const { members, isLoading, addMember, updateMemberRole, removeMember, leaveMember } =
    useGoalMembers(goalId);
  const { isOwner } = useGoalPermissions(goalId);

  const handleAddMember = async () => {
    if (!goalId || !newMemberEmail) return;

    await addMember.mutateAsync({
      goalId,
      userEmail: newMemberEmail,
      role: newMemberRole,
    });

    setNewMemberEmail("");
    setNewMemberRole("viewer");
  };

  const handleUpdateRole = async (memberId: string, role: "viewer" | "editor") => {
    await updateMemberRole.mutateAsync({ memberId, role });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm("Deseja remover este membro?")) {
      await removeMember.mutateAsync(memberId);
    }
  };

  const handleLeaveMember = async (memberId: string) => {
    if (window.confirm("Deseja sair desta meta compartilhada?")) {
      await leaveMember.mutateAsync(memberId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membros de {goalName}</DialogTitle>
          <DialogDescription>
            Gerencie quem tem acesso a esta meta e suas permissões
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo membro - apenas owner */}
          {isOwner && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar Membro
              </h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email do usuário</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select
                    value={newMemberRole}
                    onValueChange={(value: "viewer" | "editor") =>
                      setNewMemberRole(value)
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {newMemberRole === "viewer"
                      ? "Pode apenas visualizar a meta"
                      : "Pode visualizar e editar a meta"}
                  </p>
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={!newMemberEmail || addMember.isPending}
                >
                  {addMember.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de membros */}
          <div className="space-y-4">
            <h3 className="font-medium">Membros Atuais</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum membro adicionado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <Avatar>
                      <AvatarImage src={member.user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.user?.name || "Sem nome"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          member.status === "accepted"
                            ? "default"
                            : member.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {member.status === "accepted"
                          ? "Aceito"
                          : member.status === "pending"
                          ? "Pendente"
                          : "Recusado"}
                      </Badge>
                      {isOwner ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value: "viewer" | "editor") =>
                              handleUpdateRole(member.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline">
                            {member.role === "editor" ? "Editor" : "Visualizador"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLeaveMember(member.id)}
                            disabled={leaveMember.isPending}
                          >
                            Sair
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
