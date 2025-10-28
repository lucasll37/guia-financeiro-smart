import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useInvestmentCurrentValue } from "@/hooks/useInvestmentCurrentValue";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvestmentCardProps {
  investment: {
    id: string;
    name: string;
    balance: number;
    monthly_rate: number;
    initial_month: string;
  };
}

export function InvestmentCard({ investment }: InvestmentCardProps) {
  const navigate = useNavigate();
  const { data: currentValue = investment.balance } = useInvestmentCurrentValue(investment.id);
  const { returns = [] } = useMonthlyReturns(investment.id);

  const chartData = useMemo(() => {
    if (!returns || returns.length === 0) {
      return [
        { month: "Início", value: investment.balance },
        { month: "Atual", value: currentValue },
      ];
    }

    return returns
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .map((r) => ({
        month: format(new Date(r.month), "MMM", { locale: ptBR }),
        value: Number(r.balance_after),
      }));
  }, [returns, investment.balance, currentValue]);

  const gain = currentValue - investment.balance;
  const gainPercentage = investment.balance > 0 ? (gain / investment.balance) * 100 : 0;

  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 hover:border-primary/50" 
      onClick={() => navigate("/app/investimentos")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors duration-300">{investment.name}</CardTitle>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(currentValue)}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                hide 
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value)
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investido</span>
            <span className="font-medium">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(investment.balance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ganho</span>
            <span className={`font-medium ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(gain)} ({gainPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
