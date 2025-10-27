import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";

interface ComparisonChartProps {
  data: Array<{
    name: string;
    color: string;
    forecasted: number;
    actual: number;
  }>;
  accountId: string;
}

export function ComparisonChart({ data, accountId }: ComparisonChartProps) {
  const { accounts } = useAccounts();
  const account = accounts?.find((a) => a.id === accountId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: account?.currency || "BRL",
    }).format(value);
  };

  const chartData = data.map((item) => ({
    categoria: item.name,
    Previsto: item.forecasted,
    Realizado: Math.abs(item.actual),
    Diferença: item.actual - item.forecasted,
  }));

  // Calculate totals
  const totalForecasted = data.reduce((sum, item) => sum + item.forecasted, 0);
  const totalActual = data.reduce((sum, item) => sum + Math.abs(item.actual), 0);
  const totalDifference = totalActual - totalForecasted;
  const percentageDifference = totalForecasted !== 0 
    ? ((totalDifference / totalForecasted) * 100).toFixed(1)
    : "0";

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise Comparativa</CardTitle>
          <CardDescription>Previsto vs Realizado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalForecasted)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Diferença</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(totalDifference))}
              <span className="text-sm ml-2">({percentageDifference}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparação por Categoria</CardTitle>
          <CardDescription>Valores previstos vs realizados</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Bar dataKey="Previsto" fill="hsl(var(--primary))" />
              <Bar dataKey="Realizado" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
