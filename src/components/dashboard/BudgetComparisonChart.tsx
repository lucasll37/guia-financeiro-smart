import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];

interface BudgetComparisonChartProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  period: string;
}

export function BudgetComparisonChart({
  transactions,
  categories,
  budgets,
  period,
}: BudgetComparisonChartProps) {
  const chartData = useMemo(() => {
    // Group actual expenses by category
    const actualByCategory: Record<string, number> = {};

    transactions
      .filter((t) => Number(t.amount) < 0) // Only expenses
      .forEach((transaction) => {
        const categoryId = transaction.category_id;
        if (!actualByCategory[categoryId]) {
          actualByCategory[categoryId] = 0;
        }
        actualByCategory[categoryId] += Math.abs(Number(transaction.amount));
      });

    // Get budgets for the period and compare with actual
    const data = budgets
      .filter((b) => b.period === period)
      .map((budget) => {
        const category = categories.find((c) => c.id === budget.category_id);
        const actual = actualByCategory[budget.category_id] || 0;
        const planned = Number(budget.amount_planned);

        return {
          category: category?.name || "Sem categoria",
          planejado: planned,
          realizado: actual,
          diferenca: actual - planned,
        };
      })
      .filter((item) => item.planejado > 0 || item.realizado > 0);

    return data;
  }, [transactions, categories, budgets, period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provisto vs Realizado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Configure orçamentos para visualizar comparações
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provisto vs Realizado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="planejado"
                fill="hsl(var(--primary))"
                name="Planejado"
              />
              <Bar
                dataKey="realizado"
                fill="hsl(var(--accent))"
                name="Realizado"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
