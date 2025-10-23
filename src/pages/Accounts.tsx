import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
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
    </div>
  );
}
