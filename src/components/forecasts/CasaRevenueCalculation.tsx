import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCasaRevenueSplit } from "@/hooks/useCasaRevenueSplit";
import { CasaRevenueSplitManager } from "@/components/accounts/CasaRevenueSplitManager";
import { TrendingUp, Minus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CasaRevenueCalculationProps {
  accountId: string;
  forecasts: any[];
}

export function CasaRevenueCalculation({ accountId, forecasts }: CasaRevenueCalculationProps) {
  const { calculateSplit, isCasaAccount } = useCasaRevenueSplit(accountId);

  const totalExpenses = useMemo(() => {
    return forecasts
      .filter((f) => f.categories?.type === "despesa")
      .reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
  }, [forecasts]);

  const splits = calculateSplit(totalExpenses);
  const totalRevenue = splits.reduce((sum, s) => sum + s.amount, 0);
  const balance = totalRevenue - totalExpenses;

  if (!isCasaAccount || splits.length === 0) return null;

  return (
    <Card className="overflow-hidden border-2 border-primary/10">
      <CardHeader className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Receitas
              </CardTitle>
              <CardDescription>
                Contribuição necessária para equilibrar o orçamento
              </CardDescription>
            </div>
          </div>
          <CasaRevenueSplitManager accountId={accountId} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Tabela de Receitas */}
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-6 text-sm font-semibold text-muted-foreground">
                  Membro
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Peso
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Percentual
                </th>
                <th className="text-right py-3 px-6 text-sm font-semibold text-muted-foreground">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {splits.map((split, index) => (
                <tr 
                  key={split.user_id}
                  className={`border-b last:border-0 transition-colors hover:bg-green-500/5 ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  }`}
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium">{split.name}</p>
                      {split.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {split.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium">
                      {split.weight}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-sm text-muted-foreground font-medium">
                      {split.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-4 px-6">
                    <span className="text-base font-semibold text-green-600 dark:text-green-400">
                      R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-gradient-to-b from-muted/30 to-muted/50 p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Total de Receitas:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Total de Despesas:</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <Separator className="my-2" />
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Saldo Final:</span>
            </div>
            <span className={`text-2xl font-bold ${
              balance === 0 
                ? 'text-primary' 
                : balance > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
            }`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          {balance === 0 && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              ✓ Orçamento equilibrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
