import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
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

interface TransactionsProps {
  accountId?: string;
}

export default function Transactions({ accountId: propAccountId }: TransactionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const { logAction } = useAuditLogs();

  const currentMonth = format(new Date(), "yyyy-MM");
  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [filters, setFilters] = useState({
    accountId: propAccountId || "all",
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
  
  // Update filters when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setFilters(prev => ({ ...prev, accountId: propAccountId }));
    }
  }, [propAccountId]);

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
      const transactionDate = parse(String(t.date), "yyyy-MM-dd", new Date());
      const startDate = parse(filters.startDate, "yyyy-MM-dd", new Date());
      const endDate = parse(filters.endDate, "yyyy-MM-dd", new Date());
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
    const isInstallment = transactionData.description?.includes("(Compra em");
    
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
      }
    }
    
    // Mostrar toast apenas para transações únicas ou na última parcela
    if (!isInstallment) {
      setDialogOpen(false);
      setSelectedTransaction(null);
    }
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
        accountId={propAccountId}
      />

      {isLoading ? (
        <p className="text-muted-foreground">Carregando lançamentos...</p>
      ) : (
        <TransactionsTable
          transactions={filteredTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction}
        accounts={accounts || []}
        categories={categories || []}
        currentUserId={user.id}
      />

    </div>
  );
}
