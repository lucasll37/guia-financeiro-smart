import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useMaskValues } from "@/hooks/useMaskValues";

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
  const { maskValue } = useMaskValues();

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

  const CustomTooltip = ({ active, payload, total }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold mb-2">{data.payload.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">{maskValue(formatCurrency(data.value))}</span>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico Previsto */}
      <Card className="animate-fade-in overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="w-3 h-3 rounded-full bg-primary" />
            Gastos Previstos
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-semibold">{maskValue(formatCurrency(totalForecasted))}</span>
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={forecastedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={130}
                innerRadius={70}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {forecastedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={(props) => <CustomTooltip {...props} total={totalForecasted} />} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                iconType="circle"
                formatter={(value, entry: any) => {
                  const percent = totalForecasted > 0 ? ((entry.payload.value / totalForecasted) * 100).toFixed(1) : '0';
                  return (
                    <span className="text-xs">
                      {entry.payload.name} ({percent}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Realizado */}
      <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: "100ms" }}>
        <CardHeader className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            Gastos Realizados
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: <span className="font-semibold">{maskValue(formatCurrency(totalActual))}</span>
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={actualData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={130}
                innerRadius={70}
                fill="#8884d8"
                dataKey="value"
                animationBegin={100}
                animationDuration={800}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {actualData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={(props) => <CustomTooltip {...props} total={totalActual} />} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                iconType="circle"
                formatter={(value, entry: any) => {
                  const percent = totalActual > 0 ? ((entry.payload.value / totalActual) * 100).toFixed(1) : '0';
                  return (
                    <span className="text-xs">
                      {entry.payload.name} ({percent}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
