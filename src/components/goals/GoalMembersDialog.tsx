import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Eye, Edit } from "lucide-react";
import { useGoalMembers } from "@/hooks/useGoalMembers";
import { useGoalPermissions } from "@/hooks/useGoalPermissions";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  
  const { members, isLoading, addMember, removeMember } =
    useGoalMembers(goalId);
  const { isOwner } = useGoalPermissions(goalId);

  // Query to find user by email
  const { refetch: searchUser } = useQuery({
    queryKey: ["search-user", email],
    queryFn: async () => {
      if (!email) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: false,
  });

  const handleInvite = async () => {
    if (!goalId || !email) return;

    // Search for user
    const { data: user } = await searchUser();

    if (!user) {
      toast({
        title: "Usuário não encontrado",
        description: "Não foi possível encontrar um usuário com este e-mail",
        variant: "destructive",
      });
      return;
    }

    // Check if already a member
    const alreadyMember = members?.some((m) => m.user_id === user.id);
    if (alreadyMember) {
      toast({
        title: "Usuário já é membro",
        description: "Este usuário já é um membro desta meta",
        variant: "destructive",
      });
      return;
    }

    await addMember.mutateAsync({
      goalId,
      userEmail: email,
      role,
    });

    setEmail("");
    setRole("viewer");
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant="default">Ativo</Badge>;
  };

  const getRoleIcon = (role: string) => {
    return role === "editor" ? (
      <Edit className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    );
  };

  const getRoleLabel = (role: string) => {
    return role === "editor" ? "Editor" : "Visualizador";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros</DialogTitle>
          <DialogDescription>
            Convide usuários para compartilhar a meta "{goalName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Form (only for owners) */}
          {isOwner && (
            <div className="space-y-4 border-b pb-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail do usuário</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select value={role} onValueChange={(v: "viewer" | "editor") => setRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador (apenas leitura)</SelectItem>
                      <SelectItem value="editor">Editor (pode editar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleInvite} disabled={!email || addMember.isPending}>
                <UserPlus className="h-4 w-4 mr-2" />
                Enviar Convite
              </Button>
            </div>
          )}

          {/* Members List - Only for owners */}
          {isOwner && (
            <div className="space-y-4">
              <h3 className="font-semibold">Membros</h3>
              {members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{member.user?.name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                        <div className="flex gap-2 mt-2">
                          {getStatusBadge(member.status)}
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember.mutate(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum membro convidado ainda
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
