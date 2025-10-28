import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyReturn {
  month: string;
  actual_return: number;
  inflation_rate: number;
  contribution: number;
  balance_after: number;
}

interface ChartDataPoint {
  month: string;
  saldoAparente: number;
  saldoValorPresente: number;
  aportesAparente: number;
  aportesValorPresente: number;
  isProjection?: boolean;
}

interface ProjectionConfig {
  months: number;
  monthlyRate: number;
  inflationRate: number;
  monthlyContribution: number;
}

interface InvestmentChartsProps {
  returns: MonthlyReturn[];
  initialBalance: number;
  currentBalance: number;
  lastReturnMonth: Date;
  projectionConfig: ProjectionConfig;
}

export function InvestmentCharts({
  returns,
  initialBalance,
  currentBalance,
  lastReturnMonth,
  projectionConfig,
}: InvestmentChartsProps) {
  
  const realReturnsData: ChartDataPoint[] = useMemo(() => {
    if (!returns || returns.length === 0) return [];
    
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;
    
    return returns.map((r) => {
      const monthDate = new Date(r.month);
      const balance = Number(r.balance_after);
      const contribution = Number(r.contribution);
      const inflationRate = Number(r.inflation_rate) / 100;
      
      cumulativeContribution += contribution;
      cumulativeContributionPV += contribution; // No momento do aporte, valor presente = valor nominal
      
      // Calcular valor presente do saldo (descontando inflação acumulada)
      const monthsFromStart = returns.indexOf(r);
      const inflationFactor = Math.pow(1 + inflationRate, monthsFromStart);
      const balancePV = balance / inflationFactor;
      
      return {
        month: format(monthDate, "MMM/yy", { locale: ptBR }),
        saldoAparente: balance,
        saldoValorPresente: balancePV,
        aportesAparente: cumulativeContribution,
        aportesValorPresente: cumulativeContributionPV,
      };
    });
  }, [returns]);

  const combinedData: ChartDataPoint[] = useMemo(() => {
    const data = [...realReturnsData];
    
    if (returns && returns.length > 0 && projectionConfig.months > 0) {
      let balance = currentBalance;
      let cumulativeContribution = data[data.length - 1]?.aportesAparente || 0;
      let cumulativeContributionPV = data[data.length - 1]?.aportesValorPresente || 0;
      
      const totalMonths = returns.length;
      const avgInflationRate = returns.reduce((sum, r) => sum + Number(r.inflation_rate), 0) / returns.length / 100;
      
      for (let i = 1; i <= projectionConfig.months; i++) {
        const month = addMonths(lastReturnMonth, i);
        const contribution = projectionConfig.monthlyContribution;
        const returnAmount = (balance + contribution) * (projectionConfig.monthlyRate / 100);
        balance = balance + contribution + returnAmount;
        
        cumulativeContribution += contribution;
        
        // Valor presente do aporte futuro (desconto até o presente)
        const monthsFromNow = i;
        const pvFactor = Math.pow(1 + projectionConfig.inflationRate / 100, -monthsFromNow);
        cumulativeContributionPV += contribution * pvFactor;
        
        // Valor presente do saldo (descontando inflação acumulada desde o início)
        const totalMonthsFromStart = totalMonths + i;
        const inflationFactor = Math.pow(1 + avgInflationRate, totalMonthsFromStart);
        const balancePV = balance / inflationFactor;
        
        data.push({
          month: format(month, "MMM/yy", { locale: ptBR }),
          saldoAparente: balance,
          saldoValorPresente: balancePV,
          aportesAparente: cumulativeContribution,
          aportesValorPresente: cumulativeContributionPV,
          isProjection: true,
        });
      }
    }
    
    return data;
  }, [realReturnsData, returns, currentBalance, lastReturnMonth, projectionConfig]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  };

  const dividerIndex = realReturnsData.length - 1;

  if (returns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Registre rendimentos mensais para visualizar os gráficos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evolução dos Rendimentos Reais</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={realReturnsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Line
                type="monotone"
                dataKey="saldoAparente"
                name="Saldo Aparente"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="saldoValorPresente"
                name="Saldo Valor Presente"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="aportesAparente"
                name="Aportes Acumulados"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="aportesValorPresente"
                name="Aportes Valor Presente"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projeção Futura com Histórico Real</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <ReferenceLine
                x={combinedData[dividerIndex]?.month}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: "Início da Projeção", position: "top" }}
              />
              <Line
                type="monotone"
                dataKey="saldoAparente"
                name="Saldo Aparente"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="saldoValorPresente"
                name="Saldo Valor Presente"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="aportesAparente"
                name="Aportes Acumulados"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="aportesValorPresente"
                name="Aportes Valor Presente"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
