import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { startOfMonth, endOfMonth } from "date-fns";

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    currency: string;
  };
}

export function AccountCard({ account }: AccountCardProps) {
  const navigate = useNavigate();
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();

  const { balance, spent, budgetTotal, chartData } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const accountTransactions = transactions?.filter(
      (t) =>
        t.account_id === account.id &&
        new Date(t.date) >= monthStart &&
        new Date(t.date) <= monthEnd
    ) || [];

    const revenue = accountTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = accountTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const balance = revenue - expenses;

    // Calculate budget total
    const accountBudgets = budgets?.filter(
      (b) => b.account_id === account.id
    ) || [];
    const budgetTotal = accountBudgets.reduce(
      (sum, b) => sum + Number(b.amount_planned),
      0
    );

    const remaining = Math.max(0, budgetTotal - expenses);

    const chartData = [
      { name: "Realizado", value: expenses, color: "hsl(var(--destructive))" },
      { name: "Disponível", value: remaining, color: "hsl(var(--primary))" },
    ];

    return { balance, spent: expenses, budgetTotal, chartData };
  }, [transactions, budgets, account.id]);

  const percentage = budgetTotal > 0 ? (spent / budgetTotal) * 100 : 0;

  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 hover:border-primary/50" 
      onClick={() => navigate(`/app/contas/${account.id}`)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors duration-300">{account.name}</CardTitle>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: account.currency,
          }).format(balance)}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: account.currency,
                  }).format(value)
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Realizado</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Orçado</span>
            <span className="font-medium">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: account.currency,
              }).format(budgetTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
