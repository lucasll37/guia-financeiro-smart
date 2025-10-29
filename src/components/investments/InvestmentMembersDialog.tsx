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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvestmentMembers } from "@/hooks/useInvestmentMembers";
import { UserPlus, Trash2, Check, X, LogOut } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

interface InvestmentMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  ownerId: string;
}

export function InvestmentMembersDialog({
  open,
  onOpenChange,
  investment,
  ownerId,
}: InvestmentMembersDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const { members, inviteMember, updateMemberStatus, removeMember } = useInvestmentMembers(
    investment?.id
  );
  
  const isOwner = user?.id === ownerId;
  const currentUserMembership = members?.find(m => m.user_id === user?.id);

  // Query to find user by email
  const { data: searchedUser, refetch: searchUser } = useQuery({
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
    if (!investment || !email) return;

    // Search for user
    const { data: user } = await searchUser();

    if (!user) {
      alert("Usuário não encontrado com este e-mail");
      return;
    }

    if (user.id === ownerId) {
      alert("Você não pode convidar a si mesmo");
      return;
    }

    // Check if already a member
    const alreadyMember = members?.some((m) => m.user_id === user.id);
    if (alreadyMember) {
      alert("Este usuário já é um membro ou já foi convidado");
      return;
    }

    await inviteMember.mutateAsync({
      investment_id: investment.id,
      user_id: user.id,
      invited_by: ownerId,
      role,
      status: "pending",
    });

    setEmail("");
    setRole("viewer");
  };

  const handleLeaveInvestment = async () => {
    if (!currentUserMembership) return;
    
    const confirmed = confirm(
      "Tem certeza que deseja abandonar este investimento? Você perderá o acesso a todas as informações."
    );
    
    if (confirmed) {
      await removeMember.mutateAsync(currentUserMembership.id);
      onOpenChange(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge variant="default">Ativo</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "declined":
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    return role === "editor" ? (
      <Badge variant="outline">Editor</Badge>
    ) : (
      <Badge variant="outline">Visualizador</Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Membros</DialogTitle>
          <DialogDescription>
            {isOwner 
              ? `Convide usuários para compartilhar o investimento "${investment?.name}"`
              : `Membros do investimento "${investment?.name}"`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Leave Investment Button (for non-owners) */}
          {!isOwner && currentUserMembership && (
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Abandonar Investimento</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você perderá o acesso a este investimento
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveInvestment}
                  disabled={removeMember.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          )}

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

            <Button onClick={handleInvite} disabled={!email || inviteMember.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </div>
          )}

          {/* Members List */}
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
                      <p className="font-medium">{member.profiles?.name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(member.status)}
                       {getRoleBadge(member.role)}
                      </div>
                    </div>

                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember.mutate(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum membro convidado ainda
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
