import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, Label } from "recharts";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

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
    
    // Se não houver histórico, começar com saldo inicial
    if (returns.length === 0 && projectionConfig.months > 0) {
      let balance = initialBalance;
      let cumulativeContribution = 0;
      let cumulativeContributionPV = 0;
      let inflationAccumulator = 1;
      
      for (let i = 0; i <= projectionConfig.months; i++) {
        const month = addMonths(lastReturnMonth, i);
        
        if (i === 0) {
          // Ponto inicial
          data.push({
            month: format(month, "MMM/yy", { locale: ptBR }),
            saldoAparente: balance,
            saldoValorPresente: balance,
            aportesAparente: 0,
            aportesValorPresente: 0,
            isProjection: true,
          });
          continue;
        }
        
        const contribution = projectionConfig.monthlyContribution;
        const returnAmount = (balance + contribution) * (projectionConfig.monthlyRate / 100);
        balance = balance + contribution + returnAmount;
        
        cumulativeContribution += contribution;
        const pvFactor = Math.pow(1 + projectionConfig.inflationRate / 100, -i);
        cumulativeContributionPV += contribution * pvFactor;
        
        inflationAccumulator *= (1 + projectionConfig.inflationRate / 100);
        const cumulativeInflation = inflationAccumulator - 1;
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
    } else if (returns && returns.length > 0 && projectionConfig.months > 0) {
      // Continuar com projeção após histórico
      let balance = currentBalance;
      let cumulativeContribution = data[data.length - 1]?.aportesAparente || 0;
      let cumulativeContributionPV = data[data.length - 1]?.aportesValorPresente || 0;
      
      let inflationAccumulator = 1;
      returns.forEach((r) => {
        inflationAccumulator *= (1 + Number(r.inflation_rate) / 100);
      });
      
      for (let i = 1; i <= projectionConfig.months; i++) {
        const month = addMonths(lastReturnMonth, i);
        const contribution = projectionConfig.monthlyContribution;
        const returnAmount = (balance + contribution) * (projectionConfig.monthlyRate / 100);
        balance = balance + contribution + returnAmount;
        
        cumulativeContribution += contribution;
        const monthsFromNow = i;
        const pvFactor = Math.pow(1 + projectionConfig.inflationRate / 100, -monthsFromNow);
        cumulativeContributionPV += contribution * pvFactor;
        
        inflationAccumulator *= (1 + projectionConfig.inflationRate / 100);
        const cumulativeInflation = inflationAccumulator - 1;
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
  }, [realReturnsData, returns, currentBalance, initialBalance, lastReturnMonth, projectionConfig]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const dividerIndex = realReturnsData.length - 1;

  // Calcular estatísticas importantes
  const stats = useMemo(() => {
    if (combinedData.length === 0) return null;
    
    const firstPoint = combinedData[0];
    const lastPoint = combinedData[combinedData.length - 1];
    const totalGrowth = lastPoint.saldoValorPresente - firstPoint.saldoValorPresente;
    const totalContributions = lastPoint.aportesValorPresente;
    const returns = lastPoint.saldoValorPresente - firstPoint.saldoValorPresente - totalContributions;
    const roi = totalContributions > 0 
      ? ((lastPoint.saldoValorPresente / totalContributions) - 1) * 100 
      : 0;
    
    return {
      initial: firstPoint.saldoValorPresente,
      final: lastPoint.saldoAparente,
      finalPV: lastPoint.saldoValorPresente,
      growth: totalGrowth,
      roi,
      contributions: totalContributions,
      returns,
      months: combinedData.length - 1,
    };
  }, [combinedData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const isProjection = data.isProjection;
    const roi = data.aportesValorPresente > 0 
      ? ((data.saldoValorPresente / data.aportesValorPresente) - 1) * 100 
      : 0;

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="font-semibold">{data.month}</p>
          {isProjection && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Projeção</span>
          )}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Saldo Aparente:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrencyFull(data.saldoAparente)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Saldo VP:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--chart-2))' }}>
              {formatCurrencyFull(data.saldoValorPresente)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Aportes Acum. Aparente:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--chart-3))' }}>
              {formatCurrencyFull(data.aportesAparente)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Aportes Acum. VP:</span>
            <span className="font-semibold" style={{ color: 'hsl(var(--chart-4))' }}>
              {formatCurrencyFull(data.aportesValorPresente)}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-2 mt-2 border-t">
            <span className="text-muted-foreground font-medium">ROI:</span>
            <span className={`font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (combinedData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Configure a projeção para visualizar o gráfico
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Final VP</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.finalPV)}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">ROI</p>
                  <p className="text-2xl font-bold mt-1 text-chart-2">
                    {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  {stats.roi >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-chart-2" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-chart-3/20 bg-gradient-to-br from-chart-3/5 to-chart-3/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aportes VP</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.contributions)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-chart-4/20 bg-gradient-to-br from-chart-4/5 to-chart-4/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rendimentos VP</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.returns)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-chart-2/10 to-chart-3/10 border-b">
          <CardTitle className="text-2xl">Evolução do Investimento</CardTitle>
          <CardDescription>
            {returns.length > 0 ? 'Histórico real e projeção futura' : 'Projeção futura do investimento'}
            {stats && ` • ${stats.months} meses`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="colorSaldoAparente" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaldoVP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              >
                <Label 
                  value="Valor (R$)" 
                  angle={-90} 
                  position="insideLeft"
                  style={{ textAnchor: 'middle', fontSize: 14, fill: 'hsl(var(--muted-foreground))' }}
                />
              </YAxis>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              {returns.length > 0 && dividerIndex >= 0 && (
                <ReferenceLine
                  x={combinedData[dividerIndex]?.month}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ 
                    value: "Início Projeção", 
                    position: "top",
                    fill: 'hsl(var(--destructive))',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="saldoAparente"
                name="Saldo Aparente"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#colorSaldoAparente)"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="saldoValorPresente"
                name="Saldo VP"
                stroke="hsl(var(--chart-2))"
                strokeWidth={3}
                fill="url(#colorSaldoVP)"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="aportesAparente"
                name="Aportes Acumulados"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Historical Data Chart (only if there's history) */}
      {realReturnsData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-chart-4/10 to-chart-5/10 border-b">
            <CardTitle>Dados Históricos Detalhados</CardTitle>
            <CardDescription>Evolução real registrada mês a mês • {realReturnsData.length} meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={450}>
              <AreaChart data={realReturnsData}>
                <defs>
                  <linearGradient id="colorHistoricoSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHistoricoVP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                >
                  <Label 
                    value="Valor (R$)" 
                    angle={-90} 
                    position="insideLeft"
                    style={{ textAnchor: 'middle', fontSize: 14, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </YAxis>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Area
                  type="monotone"
                  dataKey="saldoAparente"
                  name="Saldo Aparente"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#colorHistoricoSaldo)"
                  dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="saldoValorPresente"
                  name="Saldo VP"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  fill="url(#colorHistoricoVP)"
                  dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="aportesAparente"
                  name="Aportes Acum. Aparente"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="aportesValorPresente"
                  name="Aportes Acum. VP"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
