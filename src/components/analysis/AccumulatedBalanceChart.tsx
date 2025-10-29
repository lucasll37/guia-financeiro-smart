import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useMemo } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";
interface AccumulatedBalanceChartProps {
  accountId: string;
  periodStart: string;
  periodEnd: string;
}
export function AccumulatedBalanceChart({
  accountId,
  periodStart,
  periodEnd
}: AccumulatedBalanceChartProps) {
  const {
    accounts
  } = useAccounts();
  const {
    categories
  } = useCategories(accountId);
  const {
    transactions
  } = useTransactions(accountId);
  const {
    maskValue
  } = useMaskValues();
  const account = accounts?.find(a => a.id === accountId);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: account?.currency || "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Preparar dados de saldo acumulado
  const chartData = useMemo(() => {
    if (!transactions || !categories) return [];
    const periodTransactions = transactions.filter(t => {
      const tDateStr = (t.date || "").slice(0, 10);
      return tDateStr >= periodStart && tDateStr <= periodEnd;
    });

    // Agrupar transações por dia
    const dailyBalances: Record<string, number> = {};
    periodTransactions.forEach(t => {
      const date = t.date;
      if (!dailyBalances[date]) {
        dailyBalances[date] = 0;
      }
      const category = categories.find(c => c.id === t.category_id);
      const amount = Number(t.amount);
      if (category?.type === "receita") {
        dailyBalances[date] += amount;
      } else if (category?.type === "despesa") {
        dailyBalances[date] -= amount;
      }
    });

    // Criar array de dias no período
    const days = eachDayOfInterval({
      start: parseISO(periodStart),
      end: parseISO(periodEnd)
    });

    // Calcular saldo acumulado
    let accumulated = 0;
    const result = days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dailyBalance = dailyBalances[dateStr] || 0;
      accumulated += dailyBalance;
      return {
        date: dateStr,
        dateLabel: format(day, "dd/MMM", {
          locale: ptBR
        }),
        saldo: accumulated,
        variacao: dailyBalance
      };
    });
    return result;
  }, [transactions, categories, periodStart, periodEnd]);
  const balanceMetrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        finalBalance: 0,
        initialBalance: 0,
        totalVariation: 0,
        minBalance: 0,
        maxBalance: 0
      };
    }

    const finalBalance = chartData[chartData.length - 1].saldo;
    const initialBalance = chartData[0].saldo;
    const totalVariation = finalBalance - initialBalance;
    const minBalance = Math.min(...chartData.map(d => d.saldo), 0);
    const maxBalance = Math.max(...chartData.map(d => d.saldo), 0);

    return {
      finalBalance,
      initialBalance,
      totalVariation,
      minBalance,
      maxBalance
    };
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload
  }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
...
      </div>;
  };
  if (chartData.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle>Saldo Remanescente Acumulado</CardTitle>
          <CardDescription>Evolução do saldo ao longo do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`border-chart-2/20 bg-gradient-to-br ${balanceMetrics.finalBalance >= 0 ? 'from-chart-2/5 to-chart-2/10' : 'from-destructive/5 to-destructive/10'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Final</p>
                <p className={`text-2xl font-bold mt-1 ${balanceMetrics.finalBalance >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {maskValue(formatCurrency(balanceMetrics.finalBalance))}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${balanceMetrics.finalBalance >= 0 ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                {balanceMetrics.finalBalance >= 0 ? <TrendingUp className="h-6 w-6 text-chart-2" /> : <TrendingDown className="h-6 w-6 text-destructive" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-chart-3/20 bg-gradient-to-br ${balanceMetrics.totalVariation >= 0 ? 'from-chart-2/5 to-chart-2/10' : 'from-destructive/5 to-destructive/10'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variação Total</p>
                <p className={`text-2xl font-bold mt-1 ${balanceMetrics.totalVariation >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {balanceMetrics.totalVariation >= 0 ? '+' : ''}{maskValue(formatCurrency(balanceMetrics.totalVariation))}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${balanceMetrics.totalVariation >= 0 ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                {balanceMetrics.totalVariation >= 0 ? <TrendingUp className="h-6 w-6 text-chart-2" /> : <TrendingDown className="h-6 w-6 text-destructive" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-chart-2/10 to-primary/10 border-b">
          <CardTitle className="text-2xl">Evolução do Saldo em Conta</CardTitle>
          <CardDescription>
            Saldo acumulado dia a dia no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={chartData} margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5
          }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dateLabel" tick={{
              fontSize: 11
            }} tickLine={{
              stroke: 'hsl(var(--border))'
            }} />
              <YAxis tickFormatter={value => formatCurrency(value)} tick={{
              fontSize: 11
            }} tickLine={{
              stroke: 'hsl(var(--border))'
            }} domain={[balanceMetrics.minBalance - Math.abs(balanceMetrics.minBalance) * 0.1, balanceMetrics.maxBalance + Math.abs(balanceMetrics.maxBalance) * 0.1]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{
              value: "Zero",
              position: "right",
              fontSize: 11
            }} />
              <Line type="monotone" dataKey="saldo" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{
              fill: "hsl(var(--chart-2))",
              r: 4
            }} activeDot={{
              r: 6
            }} fill="url(#colorSaldo)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>;
}