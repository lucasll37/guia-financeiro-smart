import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCasaRevenueSplit } from "@/hooks/useCasaRevenueSplit";
import { Badge } from "@/components/ui/badge";
import { CasaRevenueSplitManager } from "@/components/accounts/CasaRevenueSplitManager";

interface CasaRevenueCalculationProps {
  accountId: string;
  forecasts: any[];
}

export function CasaRevenueCalculation({ accountId, forecasts }: CasaRevenueCalculationProps) {
  const { calculateSplit, isCasaAccount } = useCasaRevenueSplit(accountId);

  const totalExpenses = useMemo(() => {
    return forecasts
      .filter((f) => f.categories?.type === "expense")
      .reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
  }, [forecasts]);

  const splits = calculateSplit(totalExpenses);

  if (!isCasaAccount || splits.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Receitas Previstas por Membro</CardTitle>
            <CardDescription>
              Contribuição necessária de cada membro para cobrir as despesas previstas (R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </CardDescription>
          </div>
          <CasaRevenueSplitManager accountId={accountId} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {splits.map((split) => (
            <div key={split.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">
                  {split.name}
                  {split.email && <span className="text-muted-foreground text-sm ml-1">({split.email})</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  Peso: {split.weight} ({split.percentage.toFixed(1)}%)
                </p>
              </div>
              <Badge variant="secondary" className="text-base px-3 py-1">
                R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
