import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";

interface BudgetProjectionProps {
  accountId: string;
  transactions: any[];
  currentMonth: string;
}

export function BudgetProjection({ accountId, transactions, currentMonth }: BudgetProjectionProps) {
  const { budgets } = useBudgets(accountId, currentMonth);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Calculate actual spending by category for current month
  const actualByCategory = transactions.reduce((acc: any, t: any) => {
    if (!t.categories || t.categories.type !== "despesa") return acc;
    
    const categoryId = t.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        name: t.categories.name,
        color: t.categories.color,
        spent: 0,
      };
    }
    acc[categoryId].spent += Number(t.amount);
    return acc;
  }, {});

  // Calculate 3-month moving average for suggestions
  const calculateMovingAverage = (categoryId: string) => {
    // Get transactions from last 3 months (simplified)
    const categoryTransactions = transactions.filter(
      (t) => t.category_id === categoryId && t.categories?.type === "despesa"
    );
    
    if (categoryTransactions.length === 0) return 0;
    
    const total = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return total / 3; // Simplified average
  };

  const budgetData = budgets?.map((budget) => {
    const categoryId = budget.category_id;
    const actual = actualByCategory[categoryId]?.spent || 0;
    const planned = Number(budget.amount_planned);
    const percentage = planned > 0 ? (actual / planned) * 100 : 0;
    const suggestion = calculateMovingAverage(categoryId);

    return {
      categoryId,
      categoryName: (budget.categories as any)?.name || "Sem categoria",
      categoryColor: (budget.categories as any)?.color || "#666",
      planned,
      actual,
      percentage,
      suggestion,
      remaining: planned - actual,
    };
  }) || [];

  const totalPlanned = budgetData.reduce((sum, b) => sum + b.planned, 0);
  const totalActual = budgetData.reduce((sum, b) => sum + b.actual, 0);
  const totalPercentage = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Orçado vs Realizado - {currentMonth}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {formatCurrency(totalActual)} / {formatCurrency(totalPlanned)}
              </span>
            </div>
            <Progress value={Math.min(totalPercentage, 100)} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalPercentage.toFixed(1)}%</span>
              <span>Restante: {formatCurrency(totalPlanned - totalActual)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {budgetData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetData.map((item) => (
              <div key={item.categoryId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.categoryColor }}
                    />
                    <span className="text-sm font-medium">{item.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{formatCurrency(item.actual)}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{formatCurrency(item.planned)}</span>
                  </div>
                </div>
                <Progress value={Math.min(item.percentage, 100)} />
                <div className="flex items-center justify-between text-xs">
                  <span className={item.percentage > 100 ? "text-destructive" : "text-muted-foreground"}>
                    {item.percentage > 100 ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {item.percentage.toFixed(0)}% (acima do orçado)
                      </span>
                    ) : (
                      <span>{item.percentage.toFixed(0)}%</span>
                    )}
                  </span>
                  {item.suggestion > 0 && (
                    <span className="text-muted-foreground">
                      Sugestão (3m): {formatCurrency(item.suggestion)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {budgetData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Nenhum orçamento definido para este mês</p>
            <p className="text-sm mt-2">Crie orçamentos para visualizar projeções</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
