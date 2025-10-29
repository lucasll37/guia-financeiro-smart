import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { useMaskValues } from "@/hooks/useMaskValues";
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
  const { maskValue } = useMaskValues();
  
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

    const periodForecasts = forecasts.filter((f) => {
      const fDateStr = (f.period_start || "").slice(0, 10);
      return fDateStr >= periodStart && fDateStr <= periodEnd;
    });
    
    const periodTransactions = transactions.filter((t) => {
      const tDateStr = (t.date || "").slice(0, 10);
      return tDateStr >= periodStart && tDateStr <= periodEnd;
    });

    const result: any[] = [];

    parentCategories.forEach(parent => {
      const parentCat = categories.find(c => c.name === parent.name && !c.parent_id);
      if (!parentCat || parentCat.type !== "despesa") return;

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

  const CustomTooltip = ({ active, payload, type, total }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.value;
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold mb-2 pb-2 border-b">{data.categoria}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">{maskValue(formatCurrency(value))}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Percentual:</span>
              <span className="font-semibold">{percent}%</span>
            </div>
          </div>
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
      <Card className="animate-fade-in overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="w-3 h-3 rounded-full bg-primary" />
            Composição Prevista
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-semibold">{maskValue(formatCurrency(totalForecasted))}</span>
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={Math.max(450, forecastedData.length * 55)}>
            <BarChart data={forecastedData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <defs>
                {forecastedData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-previsto-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor={entry.color} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={entry.color} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                type="category" 
                dataKey="categoria" 
                width={120}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} type="previsto" total={totalForecasted} />} />
              <Bar
                dataKey="value" 
                fill="hsl(var(--primary))"
                radius={[0, 8, 8, 0]}
                animationBegin={0}
                animationDuration={800}
                maxBarSize={40}
              >
                {forecastedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#gradient-previsto-${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Realizado */}
      <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: "100ms" }}>
        <CardHeader className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            Composição Realizada
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-semibold">{maskValue(formatCurrency(totalActual))}</span>
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={Math.max(450, actualData.length * 55)}>
            <BarChart data={actualData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <defs>
                {actualData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-realizado-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor={entry.color} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={entry.color} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                type="category" 
                dataKey="categoria" 
                width={120}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} type="realizado" total={totalActual} />} />
              <Bar
                dataKey="value" 
                fill="hsl(var(--chart-2))"
                radius={[0, 8, 8, 0]}
                animationBegin={100}
                animationDuration={800}
                maxBarSize={40}
              >
                {actualData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#gradient-realizado-${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
