import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];
type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

interface InvestmentSimulatorProps {
  investments: Investment[];
  monthlyReturnsByInvestment: Record<string, MonthlyReturn[]>;
}

interface ProjectionData {
  month: number;
  [key: string]: number;
}

export function InvestmentSimulator({ investments, monthlyReturnsByInvestment }: InvestmentSimulatorProps) {
  const historicalData = useMemo(() => {
    if (investments.length === 0) return [];

    const inv = investments[0];
    const returns = monthlyReturnsByInvestment[inv.id] || [];
    
    if (returns.length === 0) return [];

    // Ordenar por mês (mais antigo primeiro)
    const sortedReturns = [...returns].sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    // Criar série histórica com saldo inicial
    const data: ProjectionData[] = [];
    
    // Adicionar ponto inicial (saldo inicial do investimento)
    data.push({
      month: 0,
      [inv.name]: Number(inv.balance),
      valorPresente: Number(inv.balance),
    });

    // Adicionar cada mês histórico
    sortedReturns.forEach((ret, index) => {
      const balanceAfter = Number(ret.balance_after);
      const inflationRate = Number(ret.inflation_rate) / 100;
      
      // Calcular valor presente descontando a inflação acumulada
      let valorPresente = balanceAfter;
      for (let i = index; i >= 0; i--) {
        const pastInflation = Number(sortedReturns[i].inflation_rate) / 100;
        valorPresente = valorPresente / (1 + pastInflation);
      }

      data.push({
        month: index + 1,
        [inv.name]: balanceAfter,
        valorPresente: valorPresente,
      });
    });

    return data;
  }, [investments, monthlyReturnsByInvestment]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];

  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Simulador de Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Adicione investimentos para visualizar projeções
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução da Série Histórica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Meses', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="font-medium mb-1">
                          Mês {payload[0].payload.month}
                        </div>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex justify-between gap-4 text-sm">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-medium">{formatCurrency(entry.value)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {investments.map((inv, idx) => (
                <Line
                  key={inv.id}
                  type="monotone"
                  dataKey={inv.name}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={inv.name}
                />
              ))}
              <Line
                type="monotone"
                dataKey="valorPresente"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Valor Presente"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
