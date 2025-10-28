import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ArrowRight, Edit, Trash2 } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { MembersDialog } from "@/components/accounts/MembersDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

export default function AccountsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const { toast } = useToast();
  const { canCreateAccount, maxAccounts, userPlan } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

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

  const handleDeleteAccount = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    
    await deleteAccount.mutateAsync(id);
    toast({
      title: "Conta excluída",
      description: "A conta foi excluída com sucesso",
    });
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
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
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
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleAccountClick(account.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{account.name}</CardTitle>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Badge variant={account.type === "pessoal" ? "default" : "secondary"}>
                        {account.type === "pessoal" ? "Pessoal" : "Empresarial"}
                      </Badge>
                      {account.is_shared && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          Compartilhada
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleManageMembers(e, account)}
                      title="Gerenciar Membros"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleEditAccount(e, account)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteAccount(e, account.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Clique para acessar
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Você ainda não possui contas cadastradas
            </p>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Conta
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
    </div>
  );
}
