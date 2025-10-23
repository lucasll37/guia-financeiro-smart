import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

interface CashFlowChartProps {
  transactions: Transaction[];
  dateFrom: Date;
  dateTo: Date;
}

export function CashFlowChart({
  transactions,
  dateFrom,
  dateTo,
}: CashFlowChartProps) {
  const chartData = useMemo(() => {
    // Group transactions by month
    const monthlyData: Record<
      string,
      { revenue: number; expenses: number; balance: number }
    > = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthKey = format(date, "MMM yyyy", { locale: ptBR });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0, balance: 0 };
      }

      const amount = Number(transaction.amount);
      if (amount > 0) {
        monthlyData[monthKey].revenue += amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(amount);
      }
    });

    // Calculate cumulative balance
    let cumulativeBalance = 0;
    return Object.entries(monthlyData)
      .sort(([a], [b]) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      })
      .map(([month, data]) => {
        cumulativeBalance += data.revenue - data.expenses;
        return {
          month,
          receitas: data.revenue,
          despesas: data.expenses,
          saldo: cumulativeBalance,
        };
      });
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Consolidado</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  stroke="hsl(var(--accent))"
                  name="Receitas"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  stroke="hsl(var(--destructive))"
                  name="Despesas"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="hsl(var(--primary))"
                  name="Saldo Acumulado"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
