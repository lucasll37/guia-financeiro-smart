import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { addMonths, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
};

interface CreditCardForecastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCard: CreditCard;
  transactions: Transaction[];
}

export function CreditCardForecastDialog({
  open,
  onOpenChange,
  creditCard,
  transactions,
}: CreditCardForecastDialogProps) {
  const { formatCurrency } = useUserPreferences();
  const monthsToShow = 6; // Show 6 months forecast

  // Get recurring transactions for this card
  const recurringTransactions = transactions.filter(
    (t) => t.credit_card_id === creditCard.id && t.is_recurring
  );

  // Generate forecast for next months
  const generateForecast = () => {
    const forecasts = [];
    const today = new Date();

    for (let i = 0; i < monthsToShow; i++) {
      const forecastMonth = addMonths(startOfMonth(today), i);
      const monthKey = format(forecastMonth, "yyyy-MM");

      // Get actual transactions for this month
      const actualTransactions = transactions.filter(
        (t) =>
          t.credit_card_id === creditCard.id &&
          t.payment_month &&
          format(new Date(t.payment_month), "yyyy-MM") === monthKey
      );

      // Add recurring transactions if they're not already in actual transactions
      const allTransactions = [...actualTransactions];
      
      recurringTransactions.forEach((recurring) => {
        const exists = actualTransactions.some(
          (actual) => actual.description === recurring.description
        );
        if (!exists && i > 0) { // Only add recurring for future months
          allTransactions.push({
            ...recurring,
            payment_month: format(forecastMonth, "yyyy-MM-dd"),
            id: `${recurring.id}-forecast-${i}`,
          } as Transaction);
        }
      });

      const total = allTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      forecasts.push({
        month: forecastMonth,
        monthKey,
        transactions: allTransactions,
        total,
      });
    }

    return forecasts;
  };

  const forecasts = generateForecast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Projeção de Faturas - {creditCard.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {forecasts.map((forecast) => (
            <Card key={forecast.monthKey}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {format(forecast.month, "MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total previsto</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(forecast.total)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {forecast.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa prevista</p>
                ) : (
                  <div className="space-y-2">
                    {forecast.transactions.map((transaction) => {
                      const isProjected = transaction.id.toString().includes("forecast");
                      return (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.description}</span>
                              {isProjected && (
                                <Badge variant="outline" className="text-xs">
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                            {transaction.categories && (
                              <Badge
                                variant="outline"
                                className="text-xs w-fit"
                                style={{
                                  borderColor: transaction.categories.color,
                                  color: transaction.categories.color,
                                }}
                              >
                                {transaction.categories.name}
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(Number(transaction.amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Média mensal (próximos 6 meses)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limite do cartão: {formatCurrency(creditCard.credit_limit)}
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    forecasts.reduce((sum, f) => sum + f.total, 0) / forecasts.length
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
