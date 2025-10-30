import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { UserPlus, Trash2, LogOut, Crown, Eye, Edit, Calendar, Copy } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  currentUserId: string;
}

export function MembersDialog({
  open,
  onOpenChange,
  account,
  currentUserId,
}: MembersDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveConfirmName, setLeaveConfirmName] = useState("");
  const { members, inviteMember, removeMember } = useAccountMembers(account?.id);
  
  const isOwner = user?.id === currentUserId;
  const currentUserMembership = members?.find(m => m.user_id === user?.id);

  // Fetch owner profile
  const { data: ownerProfile } = useQuery({
    queryKey: ["owner-profile", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId,
  });

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
    if (!account || !email) return;

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

    if (user.id === currentUserId) {
      toast({
        title: "Ação inválida",
        description: "Você não pode convidar a si mesmo",
        variant: "destructive",
      });
      return;
    }

    // Check if already a member
    const alreadyMember = members?.some((m) => m.user_id === user.id);
    if (alreadyMember) {
      toast({
        title: "Usuário já é membro",
        description: "Este usuário já é um membro desta conta",
        variant: "destructive",
      });
      return;
    }

    await inviteMember.mutateAsync({
      account_id: account.id,
      user_id: user.id,
      invited_by: currentUserId,
      role,
      status: "accepted", // Direct sharing
    });

    setEmail("");
    setRole("viewer");
  };

  const handleLeaveAccount = () => {
    setLeaveConfirmName("");
    setLeaveDialogOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (!currentUserMembership || !account) return;
    
    if (leaveConfirmName !== account.name) {
      toast({
        title: "Nome incorreto",
        description: "Por favor, digite o nome exato da conta para confirmar",
        variant: "destructive",
      });
      return;
    }

    try {
      await removeMember.mutateAsync(currentUserMembership.id);
      setLeaveDialogOpen(false);
      onOpenChange(false);
      navigate("/app/contas");
    } catch (error) {
      console.error("Error leaving account:", error);
    }
  };

  const handleCopyAccountName = () => {
    if (account) {
      navigator.clipboard.writeText(account.name);
      toast({
        title: "Nome copiado",
        description: "O nome da conta foi copiado para a área de transferência",
      });
    }
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

  const getRoleDescription = (role: string) => {
    return role === "editor" 
      ? "Pode criar e editar transações"
      : "Pode apenas visualizar informações";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isOwner ? "Gerenciar Membros" : "Informações da Conta"}
          </DialogTitle>
          <DialogDescription>
            {isOwner 
              ? `Convide usuários para compartilhar a conta "${account?.name}"`
              : `Conta compartilhada: "${account?.name}"`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* For non-owners: Show enhanced info card */}
          {!isOwner && currentUserMembership && (
            <div className="space-y-4">
              {/* Owner Information Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-yellow-500/10">
                      <Crown className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Proprietário</p>
                      <p className="font-semibold text-lg">{ownerProfile?.name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{ownerProfile?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Access Information Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Access Type Card */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        currentUserMembership.role === "editor" 
                          ? "bg-blue-500/10" 
                          : "bg-gray-500/10"
                      }`}>
                        {getRoleIcon(currentUserMembership.role)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Tipo de Acesso</p>
                        <p className="font-semibold text-sm">
                          {getRoleLabel(currentUserMembership.role)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {getRoleDescription(currentUserMembership.role)}
                    </p>
                  </CardContent>
                </Card>

                {/* Shared Since Card */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Compartilhado desde</p>
                        <p className="font-semibold text-sm">
                          {format(new Date(currentUserMembership.created_at || ""), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Há {differenceInDays(new Date(), new Date(currentUserMembership.created_at))} dias
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Account Card */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <LogOut className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Abandonar Conta</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você perderá o acesso a esta conta
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleLeaveAccount}
                      disabled={removeMember.isPending}
                    >
                      Sair
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                        <p className="font-medium">{(member.user as any)?.name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">{(member.user as any)?.email}</p>
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

      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Você perderá permanentemente o acesso
              a todas as informações desta conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="account-name" className="text-sm font-normal text-muted-foreground">
                  Digite o nome da conta
                </Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                  <span className="flex-1 text-sm font-medium">{account?.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyAccountName}
                    title="Copiar nome"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="confirm-name" className="text-sm font-normal text-muted-foreground">
                  Nome da conta
                </Label>
                <Input
                  id="confirm-name"
                  value={leaveConfirmName}
                  onChange={(e) => setLeaveConfirmName(e.target.value)}
                  placeholder="Nome da conta"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              disabled={leaveConfirmName !== account?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Abandonar Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
