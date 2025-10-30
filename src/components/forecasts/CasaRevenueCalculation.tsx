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
    <div className="space-y-4">
      {/* Receitas Section */}
      <Card className="overflow-hidden border border-border/50">
        <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-b border-border/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-base font-semibold text-green-700 dark:text-green-300">
              Receitas
            </h3>
          </div>
          <CasaRevenueSplitManager accountId={accountId} />
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                  Membro
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                  Peso
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                  Percentual
                </th>
                <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">
                  Valor Previsto
                </th>
              </tr>
            </thead>
            <tbody>
              {splits.map((split) => (
                <tr 
                  key={split.user_id}
                  className="border-b border-border/30 last:border-0 hover:bg-green-500/5 transition-colors"
                >
                  <td className="py-3.5 px-6">
                    <div>
                      <p className="font-medium text-sm">{split.name}</p>
                      {split.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {split.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium">
                      {split.weight}
                    </span>
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <span className="text-sm text-muted-foreground">
                      {split.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3.5 px-6">
                    <span className="text-sm font-semibold text-foreground">
                      R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-muted/30 border-t border-border/50 px-6 py-3.5 flex items-center justify-between">
          <span className="font-semibold text-sm">Total de Receitas:</span>
          <span className="text-base font-bold text-green-600 dark:text-green-400">
            + R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Card>

      {/* Saldo Section */}
      <Card className="overflow-hidden border border-border/50 bg-muted/20">
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-base">Saldo Previsto:</span>
          <span className={`text-xl font-bold ${
            balance === 0 
              ? 'text-green-600 dark:text-green-400' 
              : balance > 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
          }`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Card>
    </div>
  );
}
