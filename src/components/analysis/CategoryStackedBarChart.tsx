import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { useMemo } from "react";

interface CategoryStackedBarChartProps {
  accountId: string;
  periodStart: string;
  periodEnd: string;
  parentCategories: Array<{
    name: string;
    color: string;
    forecasted: number;
    actual: number;
  }>;
}

export function CategoryStackedBarChart({ 
  accountId, 
  periodStart, 
  periodEnd,
  parentCategories 
}: CategoryStackedBarChartProps) {
  const { accounts } = useAccounts();
  const { categories } = useCategories(accountId);
  const { transactions } = useTransactions(accountId);
  const { forecasts } = useForecasts(accountId);
  
  const account = accounts?.find((a) => a.id === accountId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: account?.currency || "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Preparar dados combinados (previsto e realizado lado a lado)
  const chartData = useMemo(() => {
    if (!categories || !transactions || !forecasts) return [];

    const periodForecasts = forecasts.filter((f) => f.period_start === periodStart);
    const periodTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return tDate >= start && tDate <= end;
    });

    const result: any[] = [];

    parentCategories.forEach(parent => {
      const parentCat = categories.find(c => c.name === parent.name && !c.parent_id);
      if (!parentCat) return;

      const children = categories.filter(c => c.parent_id === parentCat.id);
      
      // Calcular totais previsto e realizado para esta categoria
      let forecastedTotal = 0;
      let actualTotal = 0;

      children.forEach(child => {
        const forecast = periodForecasts.find(f => f.category_id === child.id);
        if (forecast) {
          forecastedTotal += Number(forecast.forecasted_amount);
        }

        const childTransactions = periodTransactions.filter(t => t.category_id === child.id);
        actualTotal += childTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      });

      if (forecastedTotal > 0 || actualTotal > 0) {
        result.push({
          categoria: parent.name,
          Previsto: forecastedTotal,
          Realizado: actualTotal,
          color: parent.color,
        });
      }
    });

    return result.sort((a, b) => (b.Previsto + b.Realizado) - (a.Previsto + a.Realizado));
  }, [categories, transactions, forecasts, periodStart, periodEnd, parentCategories]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const previsto = data.Previsto || 0;
      const realizado = data.Realizado || 0;
      const diferenca = realizado - previsto;
      
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.categoria}</p>
          <div className="space-y-1">
            <p className="text-sm flex justify-between gap-4">
              <span className="text-primary">Previsto:</span>
              <span className="font-medium">{formatCurrency(previsto)}</span>
            </p>
            <p className="text-sm flex justify-between gap-4">
              <span style={{ color: 'hsl(var(--chart-2))' }}>Realizado:</span>
              <span className="font-medium">{formatCurrency(realizado)}</span>
            </p>
            <div className="border-t pt-1 mt-1">
              <p className={`text-sm flex justify-between gap-4 ${diferenca >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Diferença:</span>
                <span className="font-bold">{formatCurrency(Math.abs(diferenca))}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Composição por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Composição: Previsto vs Realizado</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparação dos valores totais por categoria (soma de todas as subcategorias)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 60)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis type="category" dataKey="categoria" width={120} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="Previsto" 
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              animationBegin={0}
              animationDuration={800}
            />
            <Bar 
              dataKey="Realizado" 
              fill="hsl(var(--chart-2))"
              radius={[0, 4, 4, 0]}
              animationBegin={100}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
