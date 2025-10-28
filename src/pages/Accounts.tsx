import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seedCategories } from "@/lib/seedCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AccountsTable } from "@/components/accounts/AccountsTable";
import { AccountDialog } from "@/components/accounts/AccountDialog";
import { MembersDialog } from "@/components/accounts/MembersDialog";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];

export default function Accounts() {
  const { user } = useAuth();
  const {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    deletedAccounts,
    restoreAccount,
  } = useAccounts();
  const { logAction } = useAuditLogs();

  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const handleCreateAccount = () => {
    setSelectedAccount(null);
    setAccountDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setAccountDialogOpen(true);
  };

  const handleSaveAccount = async (accountData: AccountInsert) => {
    if (selectedAccount) {
      await updateAccount.mutateAsync({ ...accountData, id: selectedAccount.id });
      
      logAction.mutate({
        entity: "accounts",
        entity_id: selectedAccount.id,
        action: "update",
        diff: accountData as any,
      });
    } else {
      const newAccount = await createAccount.mutateAsync(accountData);
      
      if (newAccount) {
        logAction.mutate({
          entity: "accounts",
          entity_id: newAccount.id,
          action: "create",
          diff: accountData as any,
        });
        
        // Criar categorias padrão via backend usando edge function
        try {
          console.log("Iniciando seed de categorias via edge function para conta:", newAccount.id);
          const { data, error } = await supabase.functions.invoke('seed-categories', {
            body: { accountId: newAccount.id },
          });
          if (error) throw error;
          console.log(`Seed de categorias concluído:`, data);
        } catch (error) {
          console.error("Erro ao criar categorias padrão via edge function:", error);
          // Fallback para função local
          try {
            console.log("Tentando fallback com função local...");
            const categoriesCreated = await seedCategories(newAccount.id);
            console.log(`${categoriesCreated} categorias criadas com sucesso via função local`);
          } catch (localError) {
            console.error("Erro ao criar categorias padrão via função local:", localError);
          }
        }
      }
    }
    
    setAccountDialogOpen(false);
    setSelectedAccount(null);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    
    await deleteAccount.mutateAsync(id);
    
    logAction.mutate({
      entity: "accounts",
      entity_id: id,
      action: "delete",
      diff: {} as any,
    });
  };

  const handleManageMembers = (account: Account) => {
    setSelectedAccount(account);
    setMembersDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e carteiras
          </p>
        </div>
        <Button onClick={handleCreateAccount}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando contas...</p>
      ) : accounts && accounts.length > 0 ? (
        <AccountsTable
          accounts={accounts}
          onEdit={handleEditAccount}
          onDelete={handleDeleteAccount}
          onManageMembers={handleManageMembers}
        />
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">Nenhuma conta cadastrada</p>
          <Button onClick={handleCreateAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Conta
          </Button>
        </div>
      )}

      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
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

      {deletedAccounts && deletedAccounts.length > 0 && (
        <div className="mt-8 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Contas Excluídas</h2>
            <p className="text-sm text-muted-foreground">
              Contas excluídas que podem ser restauradas em até 7 dias
            </p>
          </div>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Excluída em</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {deletedAccounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{account.name}</td>
                    <td className="px-4 py-3 capitalize">{account.type}</td>
                    <td className="px-4 py-3">
                      {account.deleted_at ? new Date(account.deleted_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreAccount.mutate(account.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
