import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useMaskValues } from "@/hooks/useMaskValues";
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { maskValue } = useMaskValues();
  
  const toggleCategoryExpansion = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };
  
  const { periodStart, periodEnd } = useMemo(() => 
    calculatePeriod(currentDate, closingDay), 
    [currentDate, closingDay]
  );

  const { transactions } = useTransactions(account.id);
  const { categories } = useCategories(account.id);
  const { forecasts, createForecast, updateForecast } = useForecasts(account.id);
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
        // Para transações de cartão, comparar payment_month normalizado (YYYY-MM)
        const pm = format(new Date(t.payment_month as string), "yyyy-MM");
        return pm === periodMonth;
      } else {
        // Para transações normais, comparar o mês calendário da data com o mês de referência do período
        const txMonth = format(new Date(t.date), "yyyy-MM");
        return txMonth === periodMonth;
      }
    });
  }, [transactions, periodStart, periodEnd]);

  // Calcular saldo remanescente do período anterior
  const previousBalance = useMemo(() => {
    if (!transactions) return 0;
    
    return transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return txDate < periodStart;
      })
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        return t.categories?.type === "receita" ? sum + amount : sum - amount;
      }, 0);
  }, [transactions, periodStart]);

  // Agrupar por categoria e tipo
  const { incomeTotals, expenseTotals, totalIncome, totalExpense, categoryTransactionsMap } = useMemo(() => {
    const incomeCategories: Record<string, { actual: number; forecasted: number; categoryName: string; categoryColor: string; categoryId: string; transactions: any[] }> = {};
    const expenseCategories: Record<string, { actual: number; forecasted: number; categoryName: string; categoryColor: string; categoryId: string; transactions: any[] }> = {};
    
    // Calcular valores reais e armazenar transações por categoria
    periodTransactions.forEach(t => {
      const isIncome = t.categories?.type === "receita";
      const totals = isIncome ? incomeCategories : expenseCategories;
      
      if (!totals[t.category_id]) {
        totals[t.category_id] = { 
          actual: 0, 
          forecasted: 0,
          categoryName: t.categories?.name || "Sem categoria",
          categoryColor: t.categories?.color || "#6366f1",
          categoryId: t.category_id,
          transactions: []
        };
      }
      totals[t.category_id].actual += Number(t.amount);
      totals[t.category_id].transactions.push(t);
    });

    // Adicionar previsões
    if (forecasts && categories) {
      forecasts
        .filter(f => f.period_end === format(periodEnd, "yyyy-MM-dd"))
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
              categoryId: f.category_id,
              transactions: []
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
      categoryTransactionsMap: new Map(Object.entries({ ...incomeCategories, ...expenseCategories }).map(([k, v]) => [k, v.transactions])),
    };
  }, [periodTransactions, forecasts, periodStart, categories]);

  const balance = previousBalance + totalIncome - totalExpense;

  const handlePreviousPeriod = () => {
    setCurrentDate(prev => addMonths(prev, -1));
  };

  const handleNextPeriod = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleForecastChange = async (categoryId: string, value: string) => {
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
                  <TableHead className="w-[300px]">Categoria</TableHead>
                  <TableHead className="text-right w-[140px]">Previsto</TableHead>
                  <TableHead className="text-right w-[140px]">Realizado</TableHead>
                  <TableHead className="text-right w-[140px]">Diferença</TableHead>
                  <TableHead className="text-right w-[120px]">% Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(incomeTotals).map(([categoryId, data]) => {
                  const difference = data.forecasted - data.actual;
                  const completion = data.forecasted > 0 
                    ? Math.min(100, Math.max(0, (data.actual / data.forecasted) * 100)) 
                    : 0;
                  const percentage = data.forecasted !== 0 
                    ? ((difference / data.forecasted) * 100).toFixed(1)
                    : "-";
                  const hasMultipleTransactions = data.transactions.length > 1;
                  const isExpanded = expandedCategories.has(categoryId);

                  return (
                    <>
                      <TableRow key={categoryId} className={hasMultipleTransactions ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell onClick={hasMultipleTransactions ? () => toggleCategoryExpansion(categoryId) : undefined} className="w-[300px]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {hasMultipleTransactions && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryExpansion(categoryId);
                                  }}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: data.categoryColor }}
                            />
                            <span className="truncate">{data.categoryName}</span>
                            {hasMultipleTransactions && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">({data.transactions.length})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[140px]">
                          <Input
                            type="number"
                            step="0.01"
                            value={data.forecasted || ""}
                            onChange={(e) => handleForecastChange(categoryId, e.target.value)}
                            className="w-32 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium w-[140px]">
                          {maskValue(formatCurrency(data.actual))}
                        </TableCell>
                        <TableCell className={`text-right w-[140px] ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {maskValue(formatCurrency(Math.abs(difference)))}
                        </TableCell>
                          <TableCell className="text-right w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Progress value={completion} className="h-2" />
                              </div>
                              <span className="w-12 text-right text-xs text-muted-foreground">{Math.round(completion)}%</span>
                            </div>
                          </TableCell>
                      </TableRow>
                      
                      {/* Subtabela de transações */}
                      {hasMultipleTransactions && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-1">
                              {data.transactions.map(t => (
                                <div key={t.id} className="flex justify-between text-sm py-1 px-2 hover:bg-background rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">{format(new Date(t.date), "dd/MM")}</span>
                                    <span>{t.description}</span>
                                    {t.credit_card_id && t.credit_cards && (
                                      <span className="text-xs text-muted-foreground">({t.credit_cards.name})</span>
                                    )}
                                  </div>
                                   <span className="font-medium">{maskValue(formatCurrency(Number(t.amount)))}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                  <TableCell>Total de Receitas</TableCell>
                  <TableCell colSpan={4} className="text-right text-green-600">
                    {maskValue(formatCurrency(totalIncome))}
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
                  <TableHead className="w-[300px]">Categoria</TableHead>
                  <TableHead className="text-right w-[140px]">Previsto</TableHead>
                  <TableHead className="text-right w-[140px]">Realizado</TableHead>
                  <TableHead className="text-right w-[140px]">Diferença</TableHead>
                  <TableHead className="text-right w-[120px]">% Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(expenseTotals).map(([categoryId, data]) => {
                    const difference = data.forecasted - data.actual;
                    const completion = data.forecasted > 0 
                      ? Math.min(100, Math.max(0, (data.actual / data.forecasted) * 100)) 
                      : 0;
                    const percentage = data.forecasted !== 0 
                      ? ((difference / data.forecasted) * 100).toFixed(1)
                      : "-";
                  const hasMultipleTransactions = data.transactions.length > 1;
                  const isExpanded = expandedCategories.has(categoryId);

                  return (
                    <>
                      <TableRow key={categoryId} className={hasMultipleTransactions ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell onClick={hasMultipleTransactions ? () => toggleCategoryExpansion(categoryId) : undefined} className="w-[300px]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              {hasMultipleTransactions && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategoryExpansion(categoryId);
                                  }}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: data.categoryColor }}
                            />
                            <span className="truncate">{data.categoryName}</span>
                            {hasMultipleTransactions && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">({data.transactions.length})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[140px]">
                          <Input
                            type="number"
                            step="0.01"
                            value={data.forecasted || ""}
                            onChange={(e) => handleForecastChange(categoryId, e.target.value)}
                            className="w-32 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium w-[140px]">
                          {maskValue(formatCurrency(data.actual))}
                        </TableCell>
                        <TableCell className={`text-right w-[140px] ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {maskValue(formatCurrency(Math.abs(difference)))}
                        </TableCell>
                        <TableCell className="text-right w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress value={completion} className="h-2" />
                            </div>
                            <span className="w-12 text-right text-xs text-muted-foreground">{Math.round(completion)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Subtabela de transações */}
                      {hasMultipleTransactions && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-1">
                              {data.transactions.map(t => (
                                <div key={t.id} className="flex justify-between text-sm py-1 px-2 hover:bg-background rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">{format(new Date(t.date), "dd/MM")}</span>
                                    <span>{t.description}</span>
                                    {t.credit_card_id && t.credit_cards && (
                                      <span className="text-xs text-muted-foreground">({t.credit_cards.name})</span>
                                    )}
                                  </div>
                                  <span className="font-medium">{maskValue(formatCurrency(Number(t.amount)))}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                  <TableCell>Total de Despesas</TableCell>
                  <TableCell colSpan={4} className="text-right text-destructive">
                    {maskValue(formatCurrency(totalExpense))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Saldo Remanescente */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-950/20 px-4 py-2 border-b">
            <h3 className="font-semibold text-blue-700 dark:text-blue-400">Saldo Remanescente</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Descrição</TableHead>
                <TableHead className="text-right w-[140px]">Previsto</TableHead>
                <TableHead className="text-right w-[140px]">Realizado</TableHead>
                <TableHead className="text-right w-[140px]">Diferença</TableHead>
                <TableHead className="text-right w-[120px]">% Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="w-[300px]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500" />
                    <span className="truncate">Saldo do período anterior</span>
                  </div>
                </TableCell>
                <TableCell className="text-right w-[140px]">-</TableCell>
                <TableCell className="text-right font-medium w-[140px]">
                  {maskValue(formatCurrency(previousBalance))}
                </TableCell>
                <TableCell className="text-right w-[140px]">-</TableCell>
                <TableCell className="text-right w-[120px]">-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Saldo */}
        <div className="border rounded-lg bg-muted/50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Saldo do Período:</span>
              <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {maskValue(formatCurrency(balance))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
