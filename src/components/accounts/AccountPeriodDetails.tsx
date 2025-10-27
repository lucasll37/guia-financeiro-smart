import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { useCreditCards } from "@/hooks/useCreditCards";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface AccountPeriodDetailsProps {
  account: Account;
}

function calculatePeriod(date: Date, closingDay: number) {
  const currentDay = date.getDate();
  
  if (currentDay >= closingDay) {
    // Estamos após o dia de viragem, período atual vai do dia de viragem deste mês até o dia anterior do próximo mês
    const periodStart = new Date(date.getFullYear(), date.getMonth(), closingDay);
    const periodEnd = addDays(addMonths(periodStart, 1), -1);
    return { periodStart, periodEnd };
  } else {
    // Estamos antes do dia de viragem, período atual vai do dia de viragem do mês anterior até o dia anterior deste mês
    const periodStart = new Date(date.getFullYear(), date.getMonth() - 1, closingDay);
    const periodEnd = addDays(new Date(date.getFullYear(), date.getMonth(), closingDay), -1);
    return { periodStart, periodEnd };
  }
}

export function AccountPeriodDetails({ account }: AccountPeriodDetailsProps) {
  const closingDay = account.closing_day || 1;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copyFromPeriod, setCopyFromPeriod] = useState<string>("");
  
  const { periodStart, periodEnd } = useMemo(() => 
    calculatePeriod(currentDate, closingDay), 
    [currentDate, closingDay]
  );

  const { transactions } = useTransactions(account.id);
  const { categories } = useCategories(account.id);
  const { forecasts, createForecast, updateForecast, copyForecast } = useForecasts(account.id);
  const { creditCards } = useCreditCards(account.id);

  // Filtrar transações do período atual
  // Para transações de cartão, usar payment_month; para outras, usar date
  const periodTransactions = useMemo(() => {
    if (!transactions) return [];
    
    // Identificar o mês de referência do período (formato YYYY-MM)
    // Usamos o mês que contém o periodEnd, pois é quando o período "fecha"
    const periodMonth = format(periodEnd, "yyyy-MM");
    
    return transactions.filter(t => {
      if (t.credit_card_id && t.payment_month) {
        // Para transações de cartão, comparar diretamente o payment_month com o periodMonth
        return t.payment_month === periodMonth;
      } else {
        // Para transações normais, usar a data da transação
        const txDate = new Date(t.date);
        return txDate >= periodStart && txDate <= periodEnd;
      }
    });
  }, [transactions, periodStart, periodEnd]);

  // Agrupar por categoria e tipo
  const { incomeTotals, expenseTotals, totalIncome, totalExpense } = useMemo(() => {
    const incomeCategories: Record<string, { actual: number; forecasted: number; categoryName: string; categoryColor: string; categoryId: string; isCard?: boolean }> = {};
    const expenseCategories: Record<string, { actual: number; forecasted: number; categoryName: string; categoryColor: string; categoryId: string; isCard?: boolean }> = {};
    
    // Calcular valores reais (excluindo transações de cartão de crédito)
    periodTransactions.forEach(t => {
      if (t.credit_card_id) return; // Pular transações de cartão, serão agrupadas separadamente
      
      const isIncome = t.categories?.type === "receita";
      const totals = isIncome ? incomeCategories : expenseCategories;
      
      if (!totals[t.category_id]) {
        totals[t.category_id] = { 
          actual: 0, 
          forecasted: 0,
          categoryName: t.categories?.name || "Sem categoria",
          categoryColor: t.categories?.color || "#6366f1",
          categoryId: t.category_id
        };
      }
      totals[t.category_id].actual += Number(t.amount);
    });

    // Adicionar totais de cartões de crédito como categorias especiais
    if (creditCards && transactions) {
      creditCards.forEach(card => {
        const allCardTransactions = transactions.filter(t => t.credit_card_id === card.id);
        
        const byMonth = new Map<string, typeof allCardTransactions>();
        allCardTransactions.forEach(t => {
          if (t.payment_month) {
            const key = t.payment_month;
            if (!byMonth.has(key)) {
              byMonth.set(key, []);
            }
            byMonth.get(key)!.push(t);
          }
        });
        
        // Filtrar meses que correspondem ao período atual
        const periodMonth = format(periodEnd, "yyyy-MM");
        const monthsInPeriod = Array.from(byMonth.entries()).filter(([month]) => {
          return month === periodMonth;
        });
        
        const totalSpent = monthsInPeriod.reduce((sum, [, txs]) => 
          sum + txs.reduce((s, t) => s + Number(t.amount), 0), 0
        );
        
        if (totalSpent > 0) {
          const cardKey = `card_${card.id}`;
          
          // Buscar previsão para cartão
          const cardForecasts = forecasts?.filter(f => {
            const category = categories?.find(c => c.id === f.category_id);
            return category?.name.toLowerCase().includes(card.name.toLowerCase()) &&
                   f.period_start === format(periodStart, "yyyy-MM-dd");
          }) || [];
          
          const totalForecast = cardForecasts.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
          
          expenseCategories[cardKey] = {
            actual: totalSpent,
            forecasted: totalForecast,
            categoryName: `Despesas - Cartão ${card.name}`,
            categoryColor: "#3b82f6", // Cor azul para cartões
            categoryId: cardKey,
            isCard: true
          };
        }
      });
    }

    // Adicionar previsões
    if (forecasts && categories) {
      forecasts
        .filter(f => f.period_start === format(periodStart, "yyyy-MM-dd"))
        .forEach(f => {
          const category = categories.find(c => c.id === f.category_id);
          const isIncome = category?.type === "receita";
          const totals = isIncome ? incomeCategories : expenseCategories;
          
          if (!totals[f.category_id]) {
            totals[f.category_id] = { 
              actual: 0, 
              forecasted: 0,
              categoryName: (f.categories as any)?.name || "Sem categoria",
              categoryColor: (f.categories as any)?.color || "#6366f1",
              categoryId: f.category_id
            };
          }
          totals[f.category_id].forecasted = Number(f.forecasted_amount);
        });
    }

    const incomeTotal = Object.values(incomeCategories).reduce((sum, cat) => sum + cat.actual, 0);
    const expenseTotal = Object.values(expenseCategories).reduce((sum, cat) => sum + cat.actual, 0);

    return {
      incomeTotals: incomeCategories,
      expenseTotals: expenseCategories,
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
    };
  }, [periodTransactions, forecasts, periodStart, categories, creditCards, transactions]);

  const balance = totalIncome - totalExpense;

  // Gerar lista de períodos disponíveis para copiar
  const availablePeriods = useMemo(() => {
    const periods = [];
    let date = addMonths(currentDate, -6);
    for (let i = 0; i < 12; i++) {
      const { periodStart: ps } = calculatePeriod(date, closingDay);
      periods.push({
        value: format(ps, "yyyy-MM-dd"),
        label: format(ps, "MMMM 'de' yyyy", { locale: ptBR })
      });
      date = addMonths(date, 1);
    }
    return periods;
  }, [currentDate, closingDay]);

  const handlePreviousPeriod = () => {
    setCurrentDate(prev => addMonths(prev, -1));
  };

  const handleNextPeriod = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleForecastChange = async (categoryId: string, value: string, isCard: boolean = false) => {
    // Se for um cartão, não permitir edição de previsão aqui
    if (isCard) return;
    
    const amount = parseFloat(value) || 0;
    const periodStartStr = format(periodStart, "yyyy-MM-dd");
    const periodEndStr = format(periodEnd, "yyyy-MM-dd");
    
    const existingForecast = forecasts?.find(
      f => f.category_id === categoryId && f.period_start === periodStartStr
    );

    if (existingForecast) {
      await updateForecast.mutateAsync({
        id: existingForecast.id,
        forecasted_amount: amount,
      });
    } else {
      await createForecast.mutateAsync({
        account_id: account.id,
        category_id: categoryId,
        period_start: periodStartStr,
        period_end: periodEndStr,
        forecasted_amount: amount,
      });
    }
  };

  const handleCopyFromPeriod = async () => {
    if (!copyFromPeriod) return;
    
    const { periodStart: targetStart, periodEnd: targetEnd } = calculatePeriod(currentDate, closingDay);
    
    await copyForecast.mutateAsync({
      sourcePeriodStart: copyFromPeriod,
      targetPeriodStart: format(targetStart, "yyyy-MM-dd"),
      targetPeriodEnd: format(targetEnd, "yyyy-MM-dd"),
      accountId: account.id,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: account.currency || 'BRL'
    }).format(value);
  };

  return (
    <div className="p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {format(periodStart, "dd/MM/yyyy")} - {format(periodEnd, "dd/MM/yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={copyFromPeriod} onValueChange={setCopyFromPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Copiar de..." />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleCopyFromPeriod}
            disabled={!copyFromPeriod}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Receitas */}
        {Object.keys(incomeTotals).length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b">
              <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">% Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(incomeTotals).map(([categoryId, data]) => {
                  const difference = data.actual - data.forecasted;
                  const percentage = data.forecasted !== 0 
                    ? ((difference / data.forecasted) * 100).toFixed(1)
                    : "-";

                  return (
                    <TableRow key={categoryId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: data.categoryColor }}
                          />
                          {data.categoryName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={data.forecasted || ""}
                          onChange={(e) => handleForecastChange(categoryId, e.target.value)}
                          className="w-32 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(data.actual)}
                      </TableCell>
                      <TableCell className={`text-right ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(difference))}
                      </TableCell>
                      <TableCell className={`text-right ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {percentage !== "-" ? `${percentage}%` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                  <TableCell>Total de Receitas</TableCell>
                  <TableCell colSpan={4} className="text-right text-green-600">
                    {formatCurrency(totalIncome)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Despesas */}
        {Object.keys(expenseTotals).length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b">
              <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead className="text-right">% Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(expenseTotals).map(([categoryId, data]) => {
                  const difference = data.actual - data.forecasted;
                  const percentage = data.forecasted !== 0 
                    ? ((difference / data.forecasted) * 100).toFixed(1)
                    : "-";

                  return (
                    <TableRow key={categoryId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: data.categoryColor }}
                          />
                          {data.categoryName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={data.forecasted || ""}
                          onChange={(e) => handleForecastChange(categoryId, e.target.value, data.isCard)}
                          className="w-32 ml-auto text-right"
                          disabled={data.isCard}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(data.actual)}
                      </TableCell>
                      <TableCell className={`text-right ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(difference))}
                      </TableCell>
                      <TableCell className={`text-right ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {percentage !== "-" ? `${percentage}%` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                  <TableCell>Total de Despesas</TableCell>
                  <TableCell colSpan={4} className="text-right text-destructive">
                    {formatCurrency(totalExpense)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Saldo */}
        <div className="border rounded-lg bg-muted/50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Saldo do Período:</span>
              <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
