import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { CopyTransactionDialog } from "@/components/transactions/CopyTransactionDialog";
import { useAccountEditPermissions } from "@/hooks/useAccountEditPermissions";
import type { Database } from "@/integrations/supabase/types";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

interface TransactionsProps {
  accountId?: string;
}

export default function Transactions({ accountId: propAccountId }: TransactionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { accounts } = useAccounts();
  const { logAction } = useAuditLogs();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [transactionToCopy, setTransactionToCopy] = useState<any>(null);
  
  // Update filters when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setFilters(prev => ({ ...prev, accountId: propAccountId }));
    }
  }, [propAccountId]);

  // Check if should auto-open dialog from URL parameter
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    if (shouldCreate === 'true') {
      setDialogOpen(true);
      setSelectedTransaction(null);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { transactions, isLoading, createTransaction, updateTransaction, deleteTransaction } =
    useTransactions(filters.accountId !== "all" ? filters.accountId : undefined);
  
  const { categories } = useCategories(
    filters.accountId !== "all" ? filters.accountId : undefined
  );

  const { data: canEdit = false } = useAccountEditPermissions(
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
      const transactionDate = parseISO(String(t.date));
      const startDate = parseISO(filters.startDate);
      const endDate = parseISO(filters.endDate);
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

  const handleSaveTransaction = async (transactionData: TransactionInsert & { _silent?: boolean }) => {
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
      const result = await createTransaction.mutateAsync(transactionData);
      const newTransaction = result?.data;
      
      if (newTransaction) {
        logAction.mutate({
          entity: "transactions",
          entity_id: newTransaction.id,
          action: "create",
          diff: transactionData as any,
        });
      }
    }
    
    // Não fechar o dialog se for parcela silenciosa
    if (!transactionData._silent) {
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

  const handleCopyTransaction = (transaction: any) => {
    setTransactionToCopy(transaction);
    setCopyDialogOpen(true);
  };

  const handleConfirmCopy = async (newDate: string) => {
    if (!user || !transactionToCopy) return;

    try {
      const newTransaction: TransactionInsert = {
        account_id: transactionToCopy.account_id,
        category_id: transactionToCopy.category_id,
        date: newDate,
        amount: transactionToCopy.amount,
        description: transactionToCopy.description,
        is_recurring: transactionToCopy.is_recurring,
        split_override: transactionToCopy.split_override,
        credit_card_id: transactionToCopy.credit_card_id,
        payment_month: transactionToCopy.payment_month,
        created_by: user.id,
      };

      await createTransaction.mutateAsync(newTransaction);
      
      logAction.mutate({
        entity: "transactions",
        entity_id: "",
        action: "create",
        diff: newTransaction as any,
      });
      
      toast({
        title: "Lançamento copiado",
        description: "O lançamento foi copiado com sucesso.",
      });
      
      setCopyDialogOpen(false);
      setTransactionToCopy(null);
    } catch (error: any) {
      toast({
        title: "Erro ao copiar",
        description: error.message,
        variant: "destructive",
      });
    }
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
        <Button onClick={handleCreateTransaction} disabled={!canEdit}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Novo Lançamento</span>}
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
          onCopy={handleCopyTransaction}
          categories={categories || []}
          canEdit={canEdit}
          accountType={filters.accountId !== "all" ? accounts?.find(a => a.id === filters.accountId)?.type : undefined}
          viewMode={filters.viewMode}
          onViewModeChange={(mode) => {
            const newFilters = { ...filters, viewMode: mode };
            if (mode === "monthly") {
              const currentMonth = format(new Date(), "yyyy-MM");
              const [y, m] = currentMonth.split("-").map(Number);
              const monthDate = new Date(y, (m || 1) - 1, 1);
              newFilters.selectedMonth = currentMonth;
              newFilters.startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
              newFilters.endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
            } else {
              const today = new Date();
              newFilters.startDate = format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd");
              newFilters.endDate = format(new Date(today.getFullYear(), 11, 31), "yyyy-MM-dd");
            }
            setFilters(newFilters);
          }}
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
        defaultAccountId={propAccountId}
      />

      <CopyTransactionDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onCopy={handleConfirmCopy}
        originalDate={transactionToCopy?.date || new Date().toISOString().split('T')[0]}
      />

    </div>
  );
}
