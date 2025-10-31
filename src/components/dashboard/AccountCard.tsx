import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { useMaskValues } from "@/hooks/useMaskValues";
import { startOfMonth, endOfMonth, format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    balance,
    spent,
    budgetTotal,
    currentPeriod,
    completion
  } = useMemo(() => {
    const now = currentDate;
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentPeriod = format(now, "MMMM 'de' yyyy", {
      locale: ptBR
    });
    const periodMonth = format(monthEnd, "yyyy-MM");
    const periodEndStr = format(monthEnd, "yyyy-MM-dd");

    // Saldo anterior: transações até o início do período
    const previousBalance = transactions?.filter(t => {
      if (t.account_id !== account.id) return false;
      if (t.credit_card_id && t.payment_month) {
        const txDate = parseISO(t.payment_month as string);
        return txDate < monthStart;
      } else {
        const txDate = parseISO(t.date);
        return txDate < monthStart;
      }
    }).reduce((sum, t) => {
      if (t.categories?.type === "receita") {
        return sum + Number(t.amount);
      } else if (t.categories?.type === "despesa") {
        return sum - Number(t.amount);
      }
      return sum;
    }, 0) || 0;

    // Transações do período selecionado
    const periodTransactions = transactions?.filter(t => {
      if (t.account_id !== account.id) return false;
      if (t.description === "Saldo Anterior") return false; // evitar duplicidade do saldo anterior
      if (t.credit_card_id && t.payment_month) {
        const txMonth = format(parseISO(t.payment_month as string), "yyyy-MM");
        return txMonth === periodMonth;
      } else {
        const txMonth = format(parseISO(t.date), "yyyy-MM");
        return txMonth === periodMonth;
      }
    }) || [];

    // Receitas do período
    const periodIncome = periodTransactions
      .filter(t => t.categories?.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Despesas do período
    const expenses = periodTransactions
      .filter(t => t.categories?.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Saldo do período = Saldo Anterior + Receitas - Despesas
    const balance = previousBalance + periodIncome - expenses;

    // Forecast total for selected period (only expenses)
    const accountForecasts = forecasts?.filter(f => 
      f.account_id === account.id && 
      f.period_end === periodEndStr && 
      f.categories?.type === 'despesa'
    ) || [];
    const budgetTotal = accountForecasts.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
    const completion = budgetTotal > 0 ? expenses / budgetTotal * 100 : 0;
    return {
      balance,
      spent: expenses,
      budgetTotal,
      currentPeriod,
      completion
    };
  }, [transactions, forecasts, account.id, currentDate]);
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
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Período</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {
                e.stopPropagation();
                setCurrentDate(prev => addMonths(prev, -1));
              }} aria-label="Período anterior">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="font-medium capitalize min-w-[140px] text-center">{currentPeriod}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {
                e.stopPropagation();
                setCurrentDate(prev => addMonths(prev, 1));
              }} aria-label="Próximo período">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gastos Previstos</span>
            <span className="font-medium">
              {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: account.currency
            }).format(budgetTotal))}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gastos Realizados</span>
            <span className="font-medium">
              {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: account.currency
            }).format(spent))}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-end mb-1">
              <span className="text-xs font-semibold text-primary">
                {Math.round(completion)}%
              </span>
            </div>
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-primary to-primary/80"
                style={{
                  width: `${Math.min(completion, 100)}%`,
                }}
              />
              
              {completion > 100 && (
                <div className="absolute inset-y-0 right-0 w-0.5 bg-destructive" />
              )}
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