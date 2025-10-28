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

  // Preparar dados detalhados com subcategorias
  const detailedData = useMemo(() => {
    if (!categories || !transactions || !forecasts) return { forecasted: [], actual: [] };

    const periodForecasts = forecasts.filter((f) => f.period_start === periodStart);
    const periodTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return tDate >= start && tDate <= end;
    });

    // Mapear dados por categoria pai e suas subcategorias
    const forecastedMap: Record<string, any> = {};
    const actualMap: Record<string, any> = {};

    parentCategories.forEach(parent => {
      const parentCat = categories.find(c => c.name === parent.name && !c.parent_id);
      if (!parentCat) return;

      const children = categories.filter(c => c.parent_id === parentCat.id);
      
      // Dados previsto
      const forecastedItem: any = {
        categoria: parent.name,
        total: 0,
        color: parent.color,
      };

      // Adicionar previsões das subcategorias
      children.forEach(child => {
        const forecast = periodForecasts.find(f => f.category_id === child.id);
        if (forecast) {
          forecastedItem[child.name] = Number(forecast.forecasted_amount);
          forecastedItem.total += Number(forecast.forecasted_amount);
        }
      });

      if (forecastedItem.total > 0) {
        forecastedMap[parent.name] = forecastedItem;
      }

      // Dados realizado
      const actualItem: any = {
        categoria: parent.name,
        total: 0,
        color: parent.color,
      };

      // Adicionar transações das subcategorias
      children.forEach(child => {
        const childTransactions = periodTransactions.filter(t => t.category_id === child.id);
        const childTotal = childTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        if (childTotal > 0) {
          actualItem[child.name] = childTotal;
          actualItem.total += childTotal;
        }
      });

      if (actualItem.total > 0) {
        actualMap[parent.name] = actualItem;
      }
    });

    return {
      forecasted: Object.values(forecastedMap),
      actual: Object.values(actualMap),
    };
  }, [categories, transactions, forecasts, periodStart, periodEnd, parentCategories]);

  // Obter todas as subcategorias únicas para as legendas
  const allSubcategories = useMemo(() => {
    const subs = new Set<string>();
    [...detailedData.forecasted, ...detailedData.actual].forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'categoria' && key !== 'total' && key !== 'color') {
          subs.add(key);
        }
      });
    });
    return Array.from(subs);
  }, [detailedData]);

  // Gerar cores para subcategorias
  const getSubcategoryColor = (subcategoryName: string, index: number) => {
    const hues = [210, 240, 270, 180, 150, 120, 90, 60, 30, 0];
    const hue = hues[index % hues.length];
    return `hsl(${hue}, 70%, 50%)`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold mb-2">{data.categoria}</p>
          <p className="text-sm font-bold mb-1">
            Total: {formatCurrency(data.total)}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-xs flex justify-between gap-2">
                <span style={{ color: entry.fill }}>{entry.name}:</span>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (detailedData.forecasted.length === 0 && detailedData.actual.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico Previsto com Subcategorias */}
      {detailedData.forecasted.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              Composição Prevista por Subcategoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={detailedData.forecasted} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis type="category" dataKey="categoria" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {allSubcategories.map((subcategory, index) => (
                  <Bar 
                    key={subcategory} 
                    dataKey={subcategory} 
                    stackId="a" 
                    fill={getSubcategoryColor(subcategory, index)}
                    animationBegin={index * 50}
                    animationDuration={800}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico Realizado com Subcategorias */}
      {detailedData.actual.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-2" />
              Composição Realizada por Subcategoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={detailedData.actual} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis type="category" dataKey="categoria" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {allSubcategories.map((subcategory, index) => (
                  <Bar 
                    key={subcategory} 
                    dataKey={subcategory} 
                    stackId="a" 
                    fill={getSubcategoryColor(subcategory, index)}
                    animationBegin={index * 50 + 100}
                    animationDuration={800}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
