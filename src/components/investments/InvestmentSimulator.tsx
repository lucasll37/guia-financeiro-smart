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
  const projections = useMemo(() => {
    const periods = [3, 6, 12];
    const results: Record<number, ProjectionData[]> = {};

    periods.forEach((months) => {
      const data: ProjectionData[] = [];

      // Get the maximum number of historical months across all investments
      const maxHistoricalMonths = Math.max(
        ...investments.map((inv) => monthlyReturnsByInvestment[inv.id]?.length || 0),
        0
      );

      for (let i = 0; i <= months; i++) {
        const monthData: ProjectionData = { month: i };
        
        investments.forEach((inv) => {
          const returns = monthlyReturnsByInvestment[inv.id] || [];
          
          if (i < returns.length) {
            // Use historical data
            monthData[inv.name] = Number(returns[returns.length - 1 - i]?.balance_after || inv.balance);
          } else {
            // Project future based on average return rate from historical data
            if (returns.length > 0) {
              const avgReturn = returns.reduce((sum, ret) => {
                const returnRate = Number(ret.actual_return) / Number(ret.balance_after);
                return sum + returnRate;
              }, 0) / returns.length;
              
              const lastBalance = returns.length > 0 
                ? Number(returns[0].balance_after) 
                : Number(inv.balance);
              
              const monthsToProject = i - returns.length + 1;
              monthData[inv.name] = lastBalance * Math.pow(1 + avgReturn, monthsToProject);
            } else {
              // No historical data, use current balance
              monthData[inv.name] = Number(inv.balance);
            }
          }
        });

        data.push(monthData);
      }

      results[months] = data;
    });

    return results;
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
        <CardTitle>Projeção de Evolução</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="12">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="3">3 meses</TabsTrigger>
            <TabsTrigger value="6">6 meses</TabsTrigger>
            <TabsTrigger value="12">12 meses</TabsTrigger>
          </TabsList>

          {[3, 6, 12].map((period) => (
            <TabsContent key={period} value={period.toString()}>
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projections[period]}>
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
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
