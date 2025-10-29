import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";

interface KPI {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  investments: number;
  revenueChange: number;
  expensesChange: number;
  balanceChange: number;
  investmentsChange: number;
}

interface DashboardKPIsProps {
  kpis: KPI;
}

export function DashboardKPIs({ kpis }: DashboardKPIsProps) {
  const { formatCurrency } = useUserPreferences();
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number, isExpense = false) => {
    if (value === 0) return "text-muted-foreground";
    // For expenses, negative is good (less spending)
    if (isExpense) {
      return value < 0 ? "text-accent" : "text-destructive";
    }
    // For revenue/balance, positive is good
    return value >= 0 ? "text-accent" : "text-destructive";
  };

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(kpis.totalRevenue)}
          </div>
          <p className={cn("text-xs", getChangeColor(kpis.revenueChange))}>
            {formatPercentage(kpis.revenueChange)} vs período anterior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <p className={cn("text-xs", getChangeColor(kpis.expensesChange, true))}>
            {formatPercentage(kpis.expensesChange)} vs período anterior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(kpis.balance)}
          </div>
          <p className={cn("text-xs", getChangeColor(kpis.balanceChange))}>
            {formatPercentage(kpis.balanceChange)} vs período anterior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(kpis.investments)}
          </div>
          <p className={cn("text-xs", getChangeColor(kpis.investmentsChange))}>
            {formatPercentage(kpis.investmentsChange)} vs período anterior
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
