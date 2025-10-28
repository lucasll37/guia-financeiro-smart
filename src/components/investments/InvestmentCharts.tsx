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
    
    // Acumular inflação multiplicativamente: (1 + i1) × (1 + i2) × ... - 1
    let inflationAccumulator = 1;
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;
    
    return returns.map((r) => {
      const monthDate = new Date(r.month);
      const balance = Number(r.balance_after);
      const contribution = Number(r.contribution);
      const inflationRate = Number(r.inflation_rate) / 100;
      
      // Acumular inflação: inflação_acum = (1 + i1) × (1 + i2) × ... - 1
      inflationAccumulator *= (1 + inflationRate);
      const cumulativeInflation = inflationAccumulator - 1;
      
      // Saldo VP = Saldo Aparente / (1 + Inflação Acumulada)
      const balancePV = balance / (1 + cumulativeInflation);
      
      // Aportes acumulados
      cumulativeContribution += contribution;
      // Para aportes históricos, mantém o valor no momento da aplicação
      cumulativeContributionPV += contribution;
      
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
      
      // Pegar a inflação acumulada do último mês histórico
      const lastHistoricData = realReturnsData[realReturnsData.length - 1];
      let inflationAccumulator = 1;
      returns.forEach((r) => {
        inflationAccumulator *= (1 + Number(r.inflation_rate) / 100);
      });
      
      for (let i = 1; i <= projectionConfig.months; i++) {
        const month = addMonths(lastReturnMonth, i);
        const contribution = projectionConfig.monthlyContribution;
        const returnAmount = (balance + contribution) * (projectionConfig.monthlyRate / 100);
        balance = balance + contribution + returnAmount;
        
        // Aportes acumulados aparentes
        cumulativeContribution += contribution;
        
        // Aporte futuro VP: desconto do valor futuro para o presente
        // Fórmula: Aporte_VP = Aporte_Futuro / (1 + inflação)^n
        const monthsFromNow = i;
        const pvFactor = Math.pow(1 + projectionConfig.inflationRate / 100, -monthsFromNow);
        cumulativeContributionPV += contribution * pvFactor;
        
        // Acumular inflação projetada ao acumulador histórico
        inflationAccumulator *= (1 + projectionConfig.inflationRate / 100);
        const cumulativeInflation = inflationAccumulator - 1;
        
        // Saldo VP = Saldo Aparente / (1 + Inflação Acumulada Total)
        const balancePV = balance / (1 + cumulativeInflation);
        
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
