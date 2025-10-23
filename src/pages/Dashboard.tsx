import { useState, useMemo, lazy, Suspense } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBudgets } from "@/hooks/useBudgets";
import { useGoals } from "@/hooks/useGoals";
import { useNotifications } from "@/hooks/useNotifications";
import { useInvestments } from "@/hooks/useInvestments";
import { DashboardFiltersComponent, DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

// Lazy load charts for better performance
const CashFlowChart = lazy(() =>
  import("@/components/dashboard/CashFlowChart").then((module) => ({
    default: module.CashFlowChart,
  }))
);
const ExpensesByCategoryChart = lazy(() =>
  import("@/components/dashboard/ExpensesByCategoryChart").then((module) => ({
    default: module.ExpensesByCategoryChart,
  }))
);
const BudgetComparisonChart = lazy(() =>
  import("@/components/dashboard/BudgetComparisonChart").then((module) => ({
    default: module.BudgetComparisonChart,
  }))
);
const DashboardGoalsAlerts = lazy(() =>
  import("@/components/dashboard/DashboardGoalsAlerts").then((module) => ({
    default: module.DashboardGoalsAlerts,
  }))
);

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function Dashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<DashboardFilters>({
    dateFrom: startOfMonth(new Date()),
    dateTo: endOfMonth(new Date()),
    accountIds: [],
    granularity: "month",
  });

  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const { notifications } = useNotifications();
  const { investments } = useInvestments();

  // Initialize account IDs when accounts are loaded
  useMemo(() => {
    if (accounts && accounts.length > 0 && filters.accountIds.length === 0) {
      setFilters((prev) => ({
        ...prev,
        accountIds: accounts.map((a) => a.id),
      }));
    }
  }, [accounts]);

  // Filter transactions based on filters
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      const date = new Date(t.date);
      const inDateRange =
        date >= filters.dateFrom && date <= filters.dateTo;
      const inAccounts = filters.accountIds.includes(t.account_id);
      return inDateRange && inAccounts;
    });
  }, [transactions, filters]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = filteredTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const balance = totalRevenue - totalExpenses;

    const totalInvestments =
      investments?.reduce((sum, i) => sum + Number(i.balance), 0) || 0;

    // Calculate previous period for comparison
    const previousPeriodStart = subMonths(filters.dateFrom, 1);
    const previousPeriodEnd = subMonths(filters.dateTo, 1);

    const previousTransactions = transactions?.filter((t) => {
      const date = new Date(t.date);
      return (
        date >= previousPeriodStart &&
        date <= previousPeriodEnd &&
        filters.accountIds.includes(t.account_id)
      );
    }) || [];

    const prevRevenue = previousTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevExpenses = previousTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const prevBalance = prevRevenue - prevExpenses;

    // Calculate percentage changes
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expensesChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const balanceChange = prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      balance,
      investments: totalInvestments,
      revenueChange,
      expensesChange,
      balanceChange,
      investmentsChange: 0, // Would need historical data
    };
  }, [filteredTransactions, investments, transactions, filters]);

  // Export to CSV
  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há transações no período selecionado",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Data", "Descrição", "Categoria", "Valor", "Conta"];
    const rows = filteredTransactions.map((t) => {
      const category = categories?.find((c) => c.id === t.category_id);
      const account = accounts?.find((a) => a.id === t.account_id);
      return [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.description,
        category?.name || "Sem categoria",
        Number(t.amount).toFixed(2),
        account?.name || "Sem conta",
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Exportação concluída",
      description: "Arquivo CSV baixado com sucesso",
    });
  };

  const currentPeriod = format(filters.dateFrom, "yyyy-MM");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas finanças
        </p>
      </div>

      {accounts && accounts.length > 0 && (
        <>
          <DashboardFiltersComponent
            accounts={accounts}
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExport}
          />

          <DashboardKPIs kpis={kpis} />

          <Suspense
            fallback={
              <div className="h-[300px] flex items-center justify-center">
                Carregando gráficos...
              </div>
            }
          >
            <div className="grid gap-6 md:grid-cols-2">
              <CashFlowChart
                transactions={filteredTransactions}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
              />
              <ExpensesByCategoryChart
                transactions={filteredTransactions}
                categories={categories || []}
              />
            </div>

            <BudgetComparisonChart
              transactions={filteredTransactions}
              categories={categories || []}
              budgets={budgets || []}
              period={currentPeriod}
            />

            <DashboardGoalsAlerts
              goals={goals || []}
              notifications={notifications || []}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
