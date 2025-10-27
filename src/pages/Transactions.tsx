import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, MoveHorizontal } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useToast } from "@/hooks/use-toast";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import type { Database } from "@/integrations/supabase/types";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export default function Transactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const { logAction } = useAuditLogs();

  const currentMonth = format(new Date(), "yyyy-MM");
  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [filters, setFilters] = useState({
    accountId: "all",
    categoryId: "all",
    type: "all",
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
    search: "",
    viewMode: "monthly" as "monthly" | "custom",
    selectedMonth: currentMonth,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState<"category" | "account" | "delete" | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkAccountId, setBulkAccountId] = useState("");

  const { transactions, isLoading, createTransaction, updateTransaction, deleteTransaction } =
    useTransactions(filters.accountId !== "all" ? filters.accountId : undefined);
  
  const { categories } = useCategories(
    filters.accountId !== "all" ? filters.accountId : undefined
  );

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      // Category filter
      if (filters.categoryId !== "all" && t.category_id !== filters.categoryId) return false;
      
      // Type filter
      if (filters.type !== "all" && t.categories?.type !== filters.type) return false;
      
      // Date range filter
      const transactionDate = new Date(t.date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      if (transactionDate < startDate || transactionDate > endDate) return false;
      
      // Search filter
      if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [transactions, filters]);

  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const handleSaveTransaction = async (transactionData: TransactionInsert) => {
    if (selectedTransaction) {
      await updateTransaction.mutateAsync({ ...transactionData, id: selectedTransaction.id });
      
      logAction.mutate({
        entity: "transactions",
        entity_id: selectedTransaction.id,
        action: "update",
        diff: transactionData as any,
      });
    } else {
      const newTransaction = await createTransaction.mutateAsync(transactionData);
      
      if (newTransaction) {
        logAction.mutate({
          entity: "transactions",
          entity_id: newTransaction.id,
          action: "create",
          diff: transactionData as any,
        });

        // If recurring, create next 3 months
        if (transactionData.is_recurring) {
          const promises = [];
          for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(transactionData.date);
            nextDate.setMonth(nextDate.getMonth() + i);
            
            promises.push(
              createTransaction.mutateAsync({
                ...transactionData,
                date: nextDate.toISOString().split("T")[0],
              })
            );
          }
          await Promise.all(promises);
          
          toast({
            title: "Lançamentos recorrentes criados",
            description: "Foram criados lançamentos para os próximos 3 meses",
          });
        }
      }
    }
    
    setDialogOpen(false);
    setSelectedTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    
    await deleteTransaction.mutateAsync(id);
    
    logAction.mutate({
      entity: "transactions",
      entity_id: id,
      action: "delete",
      diff: {} as any,
    });
  };

  const handleBulkCategoryChange = async () => {
    if (!bulkCategoryId) return;

    for (const id of selectedIds) {
      const transaction = filteredTransactions.find((t) => t.id === id);
      if (transaction) {
        await updateTransaction.mutateAsync({
          id,
          category_id: bulkCategoryId,
        });
      }
    }

    toast({
      title: "Categorias atualizadas",
      description: `${selectedIds.length} lançamento(s) atualizado(s)`,
    });

    setSelectedIds([]);
    setBulkActionDialog(null);
    setBulkCategoryId("");
  };

  const handleBulkAccountChange = async () => {
    if (!bulkAccountId) return;

    for (const id of selectedIds) {
      await updateTransaction.mutateAsync({
        id,
        account_id: bulkAccountId,
      });
    }

    toast({
      title: "Contas atualizadas",
      description: `${selectedIds.length} lançamento(s) movido(s)`,
    });

    setSelectedIds([]);
    setBulkActionDialog(null);
    setBulkAccountId("");
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteTransaction.mutateAsync(id);
      
      logAction.mutate({
        entity: "transactions",
        entity_id: id,
        action: "delete",
        diff: {} as any,
      });
    }

    toast({
      title: "Lançamentos excluídos",
      description: `${selectedIds.length} lançamento(s) excluído(s)`,
    });

    setSelectedIds([]);
    setBulkActionDialog(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
          <p className="text-muted-foreground">
            Registre suas receitas e despesas
          </p>
        </div>
        <Button onClick={handleCreateTransaction}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      <TransactionFilters
        accounts={accounts || []}
        categories={categories || []}
        filters={filters}
        onFilterChange={setFilters}
      />

      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted">
            <span className="text-sm">{selectedIds.length} selecionado(s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionDialog("category")}
            >
              <Edit className="h-4 w-4 mr-2" />
              Alterar Categoria
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionDialog("account")}
            >
              <MoveHorizontal className="h-4 w-4 mr-2" />
              Mover Conta
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkActionDialog("delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground">Carregando lançamentos...</p>
        ) : (
          <TransactionsTable
            transactions={filteredTransactions}
            selectedIds={selectedIds}
            onSelectAll={(selected) => {
              setSelectedIds(selected ? filteredTransactions.map((t) => t.id) : []);
            }}
            onSelectOne={(id, selected) => {
              setSelectedIds(
                selected
                  ? [...selectedIds, id]
                  : selectedIds.filter((sid) => sid !== id)
              );
            }}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
          />
        )}
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction}
        accounts={accounts || []}
        categories={categories || []}
        currentUserId={user.id}
      />

      {/* Bulk Action Dialogs */}
      <AlertDialog open={bulkActionDialog === "category"} onOpenChange={() => setBulkActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a nova categoria para {selectedIds.length} lançamento(s)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCategoryChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkActionDialog === "account"} onOpenChange={() => setBulkActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para Outra Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a conta de destino para {selectedIds.length} lançamento(s)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={bulkAccountId} onValueChange={setBulkAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAccountChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkActionDialog === "delete"} onOpenChange={() => setBulkActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.length} lançamento(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
