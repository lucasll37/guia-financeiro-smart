import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useMaskValues } from "@/hooks/useMaskValues";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

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
  const { maskValue } = useMaskValues();

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2 pb-2 border-b">{data.categoria}</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Previsto:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
              {maskValue(formatCurrency(data.Previsto))}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Realizado:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--chart-2))' }}>
              {maskValue(formatCurrency(data.Realizado))}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-2 mt-2 border-t">
            <span className="text-muted-foreground">Diferença:</span>
            <span className={`font-bold ${data.Diferença >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {data.Diferença >= 0 ? '+' : ''}{maskValue(formatCurrency(Math.abs(data.Diferença)))}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Previsto</p>
                <p className="text-2xl font-bold mt-1">{maskValue(formatCurrency(totalForecasted))}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-chart-2/20 bg-gradient-to-br from-chart-2/5 to-chart-2/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Realizado</p>
                <p className="text-2xl font-bold mt-1">{maskValue(formatCurrency(totalActual))}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-chart-3/20 bg-gradient-to-br ${totalDifference >= 0 ? 'from-chart-2/5 to-chart-2/10' : 'from-destructive/5 to-destructive/10'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Diferença</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {maskValue(formatCurrency(Math.abs(totalDifference)))}
                  </p>
                  <span className={`text-sm font-medium ${totalDifference >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    ({percentageDifference}%)
                  </span>
                </div>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${totalDifference >= 0 ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                {totalDifference >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-chart-2" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-chart-2/10 to-chart-3/10 border-b">
          <CardTitle className="text-2xl">Previsto x Realizado</CardTitle>
          <CardDescription>
            Comparação de valores previstos e realizados por categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="categoria" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="Previsto" 
                fill="url(#colorPrevisto)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="Realizado" 
                fill="url(#colorRealizado)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
