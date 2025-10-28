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

  const CustomTooltip = ({ active, payload, type }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = type === 'previsto' ? data.Previsto : data.Realizado;
      
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.categoria}</p>
          <p className="text-sm">
            {formatCurrency(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Separar dados previsto e realizado
  const forecastedData = chartData.filter(item => item.Previsto > 0).map(item => ({
    categoria: item.categoria,
    value: item.Previsto,
    color: item.color,
  }));

  const actualData = chartData.filter(item => item.Realizado > 0).map(item => ({
    categoria: item.categoria,
    value: item.Realizado,
    color: item.color,
  }));

  const totalForecasted = forecastedData.reduce((sum, item) => sum + item.value, 0);
  const totalActual = actualData.reduce((sum, item) => sum + item.value, 0);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico Previsto */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            Composição Prevista por Categoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalForecasted)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(400, forecastedData.length * 50)}>
            <BarChart data={forecastedData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="categoria" width={110} />
              <Tooltip content={(props) => <CustomTooltip {...props} type="previsto" />} />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                animationBegin={0}
                animationDuration={800}
              >
                {forecastedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Realizado */}
      <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            Composição Realizada por Categoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalActual)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(400, actualData.length * 50)}>
            <BarChart data={actualData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="categoria" width={110} />
              <Tooltip content={(props) => <CustomTooltip {...props} type="realizado" />} />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--chart-2))"
                radius={[0, 4, 4, 0]}
                animationBegin={100}
                animationDuration={800}
              >
                {actualData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
