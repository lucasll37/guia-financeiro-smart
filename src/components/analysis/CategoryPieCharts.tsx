import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";

interface CategoryPieChartsProps {
  data: Array<{
    name: string;
    color: string;
    forecasted: number;
    actual: number;
  }>;
  accountId: string;
}

export function CategoryPieCharts({ data, accountId }: CategoryPieChartsProps) {
  const { accounts } = useAccounts();
  const account = accounts?.find((a) => a.id === accountId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: account?.currency || "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number, total: number) => {
    return ((value / total) * 100).toFixed(1) + "%";
  };

  // Preparar dados para gráficos de pizza
  const forecastedData = data
    .filter(item => item.forecasted > 0)
    .map(item => ({
      name: item.name,
      value: Math.abs(item.forecasted),
      color: item.color,
    }));

  const actualData = data
    .filter(item => Math.abs(item.actual) > 0)
    .map(item => ({
      name: item.name,
      value: Math.abs(item.actual),
      color: item.color,
    }));

  const totalForecasted = forecastedData.reduce((sum, item) => sum + item.value, 0);
  const totalActual = actualData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = data.name.includes('Previsto') ? totalForecasted : totalActual;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold">{data.payload.name}</p>
          <p className="text-sm">
            {formatCurrency(data.value)} ({formatPercent(data.value, total)})
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const total = entry.name ? 
      (forecastedData.find(d => d.name === entry.name) ? totalForecasted : totalActual) 
      : totalForecasted;
    
    if (!entry.value || total === 0) return null;
    
    const percent = ((entry.value / total) * 100);
    if (percent < 5) return null; // Não mostrar labels pequenas
    return `${percent.toFixed(1)}%`;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Categoria</CardTitle>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Gráfico Previsto */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            Gastos Previstos por Categoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalForecasted)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={forecastedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {forecastedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm">
                    {entry.payload.name}: {formatCurrency(entry.payload.value)}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Realizado */}
      <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            Gastos Realizados por Categoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalActual)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={actualData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                animationBegin={100}
                animationDuration={800}
              >
                {actualData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-sm">
                    {entry.payload.name}: {formatCurrency(entry.payload.value)}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
