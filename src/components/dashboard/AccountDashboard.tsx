import { useState, useMemo, lazy, Suspense } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBudgets } from "@/hooks/useBudgets";
import { useGoals } from "@/hooks/useGoals";
import { useNotifications } from "@/hooks/useNotifications";
import { useInvestments } from "@/hooks/useInvestments";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

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

interface AccountDashboardProps {
  accountId: string;
}

export function AccountDashboard({ accountId }: AccountDashboardProps) {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const { notifications } = useNotifications();
  const { investments } = useInvestments();

  // Filter transactions for this account and date range
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      const date = new Date(t.date);
      const inDateRange = date >= dateFrom && date <= dateTo;
      const inAccount = t.account_id === accountId;
      return inDateRange && inAccount;
    });
  }, [transactions, dateFrom, dateTo, accountId]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = filteredTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const balance = totalRevenue - totalExpenses;

    const accountInvestments = investments?.filter((i) => i.account_id === accountId) || [];
    const totalInvestments = accountInvestments.reduce((sum, i) => sum + Number(i.balance), 0);

    // Calculate previous period for comparison
    const previousPeriodStart = subMonths(dateFrom, 1);
    const previousPeriodEnd = subMonths(dateTo, 1);

    const previousTransactions = transactions?.filter((t) => {
      const date = new Date(t.date);
      return (
        date >= previousPeriodStart &&
        date <= previousPeriodEnd &&
        t.account_id === accountId
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
      investmentsChange: 0,
    };
  }, [filteredTransactions, investments, transactions, dateFrom, dateTo, accountId]);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há transações no período selecionado",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Data", "Descrição", "Categoria", "Valor"];
    const rows = filteredTransactions.map((t) => {
      const category = categories?.find((c) => c.id === t.category_id);
      return [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.description,
        category?.name || "Sem categoria",
        Number(t.amount).toFixed(2),
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

  const currentPeriod = format(dateFrom, "yyyy-MM");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateFrom, "dd/MM/yyyy")} - {format(dateTo, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={(range) => {
                  if (range?.from) setDateFrom(range.from);
                  if (range?.to) setDateTo(range.to);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <DashboardKPIs kpis={kpis} />

      <Suspense
        fallback={
          <div className="h-[300px] flex items-center justify-center">
            Carregando gráficos...
          </div>
        }
      >
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <CashFlowChart
            transactions={filteredTransactions}
            dateFrom={dateFrom}
            dateTo={dateTo}
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
    </div>
  );
}
