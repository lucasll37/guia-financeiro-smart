import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { useMaskValues } from "@/hooks/useMaskValues";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
interface AccountCardProps {
  account: {
    id: string;
    name: string;
    currency: string;
  };
}
export function AccountCard({
  account
}: AccountCardProps) {
  const navigate = useNavigate();
  const {
    transactions
  } = useTransactions();
  const {
    forecasts
  } = useForecasts();
  const {
    maskValue
  } = useMaskValues();
  const {
    balance,
    spent,
    budgetTotal,
    currentPeriod,
    completion
  } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentPeriod = format(now, "MMMM 'de' yyyy", {
      locale: ptBR
    });
    const periodStart = format(monthStart, "yyyy-MM-dd");
    
    // Calculate total account balance (all transactions)
    const allAccountTransactions = transactions?.filter(t => t.account_id === account.id) || [];
    const balance = allAccountTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calculate expenses for current period only
    const currentPeriodTransactions = transactions?.filter(t => t.account_id === account.id && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd) || [];
    const expenses = currentPeriodTransactions.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // Calculate forecast total for current period (only expenses)
    const accountForecasts = forecasts?.filter(f => f.account_id === account.id && f.period_start === periodStart && Number(f.forecasted_amount) < 0) || [];
    const budgetTotal = accountForecasts.reduce((sum, f) => sum + Math.abs(Number(f.forecasted_amount)), 0);
    const completion = budgetTotal > 0 ? expenses / budgetTotal * 100 : 0;
    return {
      balance,
      spent: expenses,
      budgetTotal,
      currentPeriod,
      completion
    };
  }, [transactions, forecasts, account.id]);
  return <Card className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 hover:border-primary/50" onClick={() => navigate(`/app/contas/${account.id}`)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors duration-300">{account.name}</CardTitle>
        <div className="text-2xl font-bold">
          {maskValue(new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: account.currency
        }).format(balance))}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Período Corrente</span>
            <span className="font-medium capitalize">{currentPeriod}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas Previstas</span>
            <span className="font-medium">
              {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: account.currency
            }).format(budgetTotal))}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas Pagas</span>
            <span className="font-medium">
              {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: account.currency
            }).format(spent))}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-8 bg-muted rounded-full overflow-visible border-2" style={{
            borderColor: completion > 100 ? 'rgb(220 38 38)' : 'rgb(34 197 94)'
          }}>
              <div className={cn("absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full border-2", completion > 100 ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 border-red-600 dark:border-red-500" : "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 border-green-600 dark:border-green-500")} style={{
              width: `${Math.min(completion, 150)}%`
            }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
              </div>
              
              {completion > 100 && <div className="absolute inset-y-0 w-0.5 bg-foreground z-10" style={{
              left: `${100 / Math.min(completion, 150) * 100}%`
            }} />}
              
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-xs font-semibold text-white drop-shadow-lg">
                  {Math.round(completion)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Diferença</span>
            <span className={cn("font-semibold", budgetTotal - spent >= 0 ? "text-green-600" : "text-red-600")}>
              {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: account.currency
            }).format(budgetTotal - spent))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>;
}