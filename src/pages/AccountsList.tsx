import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ArrowRight, Edit, Trash2, Copy } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { MembersDialog } from "@/components/accounts/MembersDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

const accountTypeLabels: Record<string, string> = {
  pessoal: "Pessoal",
  conjugal: "Conjugal",
  mesada: "Mesada",
  casa: "Casa",
};

export default function AccountsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const { toast } = useToast();
  const { canCreateAccount, maxAccounts, userPlan } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const handleAccountClick = (accountId: string) => {
    navigate(`/app/contas/${accountId}`);
  };

  const handleCreateClick = async () => {
    const canCreate = await canCreateAccount();
    
    if (!canCreate) {
      toast({
        title: "Limite atingido",
        description: `Seu plano ${userPlan.toUpperCase()} permite até ${maxAccounts} conta${maxAccounts > 1 ? 's' : ''}. Faça upgrade para criar mais contas.`,
        variant: "destructive",
      });
      return;
    }
    
    setDialogOpen(true);
  };

  const handleSaveAccount = async (accountData: AccountInsert) => {
    if (selectedAccount) {
      await updateAccount.mutateAsync({ ...accountData, id: selectedAccount.id });
      toast({
        title: "Conta atualizada",
        description: "A conta foi atualizada com sucesso",
      });
    } else {
      await createAccount.mutateAsync(accountData);
      toast({
        title: "Conta criada",
        description: "A conta foi criada com sucesso",
      });
    }
    setDialogOpen(false);
    setSelectedAccount(null);
  };

  const handleEditAccount = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAccount) return;
    
    await deleteAccount.mutateAsync(selectedAccount.id);
    toast({
      title: "Conta excluída",
      description: "A conta foi excluída com sucesso",
    });
    setDeleteDialogOpen(false);
    setSelectedAccount(null);
    setDeleteConfirmName("");
  };

  const handleCopyAccountName = () => {
    if (selectedAccount) {
      navigator.clipboard.writeText(selectedAccount.name);
      toast({
        title: "Nome copiado",
        description: "O nome da conta foi copiado para a área de transferência",
      });
    }
  };

  const handleManageMembers = (e: React.MouseEvent, account: Account) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setMembersDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas financeiras
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Nova Conta</span>}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const isOwner = account.owner_id === user?.id;
            // Debug: log ownership and sharing flags for visibility issues
            console.log("AccountsList card", {
              name: account.name,
              id: account.id,
              owner_id: account.owner_id,
              currentUserId: user?.id,
              isOwner,
              is_shared: account.is_shared,
            });

            return (
              <Card
                key={account.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleAccountClick(account.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-xl truncate">{account.name}</CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <Badge variant={account.type === "pessoal" ? "default" : "secondary"}>
                          {accountTypeLabels[account.type] || account.type}
                        </Badge>
                        {account.is_shared && (
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            Compartilhada
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Botões de ação */}
                    <div className="flex gap-1 items-start">
                      {isOwner ? (
                        <>
                          {/* Botão Gerenciar Membros - apenas para contas compartilhadas do dono */}
                          {account.is_shared && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleManageMembers(e, account)}
                              title="Gerenciar Membros"
                              aria-label="Gerenciar membros"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteClick(e, account)}
                            title="Excluir"
                            aria-label="Excluir conta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEditAccount(e, account)}
                            title="Editar"
                            aria-label="Editar conta"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        /* Botão Informações da Conta - para membros não proprietários */
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleManageMembers(e, account)}
                          title="Informações da Conta"
                          aria-label="Ver informações da conta"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Clique para acessar
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Você ainda não possui contas cadastradas
            </p>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Criar Primeira Conta</span>}
            </Button>
          </CardContent>
        </Card>
      )}

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveAccount}
        account={selectedAccount}
        currentUserId={user.id}
      />

      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        account={selectedAccount}
        currentUserId={user.id}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Para confirmar, digite o nome da conta abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {selectedAccount?.name}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyAccountName}
                title="Copiar nome"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-name">Digite o nome da conta</Label>
              <Input
                id="confirm-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nome da conta"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteConfirmName !== selectedAccount?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
