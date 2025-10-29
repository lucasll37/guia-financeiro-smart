import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, endOfMonth, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useMaskValues } from "@/hooks/useMaskValues";
import { cn } from "@/lib/utils";
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
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const [balanceExpanded, setBalanceExpanded] = useState(true);
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
      // Ignorar lançamentos de Saldo Anterior para não duplicar saldos
      if (t.description === "Saldo Anterior") return false;
      if (t.credit_card_id && t.payment_month) {
        // Para transações de cartão, comparar payment_month normalizado (YYYY-MM)
        const pm = format(parseISO(t.payment_month as string), "yyyy-MM");
        return pm === periodMonth;
      } else {
        // Para transações normais, comparar o mês calendário da data com o mês de referência do período
        const txMonth = format(parseISO(t.date), "yyyy-MM");
        return txMonth === periodMonth;
      }
    });
  }, [transactions, periodStart, periodEnd]);

  // Calcular saldo do período anterior
  const previousBalance = useMemo(() => {
    if (!transactions) return 0;
    
    // Calcular o período anterior
    const prevPeriod = calculatePeriod(addMonths(currentDate, -1), closingDay);
    
    // Saldo antes do período anterior
    const balanceBeforePrevPeriod = transactions
      .filter(t => {
        if (t.description === "Saldo Anterior") return false;
        if (t.credit_card_id && t.payment_month) {
          const txDate = parseISO(t.payment_month as string);
          return txDate < prevPeriod.periodStart;
        } else {
          const txDate = parseISO(t.date);
          return txDate < prevPeriod.periodStart;
        }
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Transações do período anterior
    const prevPeriodMonth = format(prevPeriod.periodEnd, "yyyy-MM");
    const prevPeriodTransactions = transactions.filter(t => {
      if (t.description === "Saldo Anterior") return false;
      if (t.credit_card_id && t.payment_month) {
        const pm = format(parseISO(t.payment_month as string), "yyyy-MM");
        return pm === prevPeriodMonth;
      } else {
        const txMonth = format(parseISO(t.date), "yyyy-MM");
        return txMonth === prevPeriodMonth;
      }
    });
    
    // Receitas e despesas do período anterior
    const prevIncome = prevPeriodTransactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const prevExpenses = prevPeriodTransactions
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    // Saldo do período anterior = Saldo antes + Receitas - Despesas
    return balanceBeforePrevPeriod + prevIncome - prevExpenses;
  }, [transactions, currentDate, closingDay]);

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
      // Para despesas, usar valor absoluto para exibição correta
      const amount = Number(t.amount);
      totals[t.category_id].actual += isIncome ? amount : Math.abs(amount);
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

    // Filtrar apenas categorias com transações ou previsões
    const filteredIncomeCategories = Object.fromEntries(
      Object.entries(incomeCategories).filter(([_, cat]) => cat.actual > 0 || cat.forecasted > 0)
    );
    const filteredExpenseCategories = Object.fromEntries(
      Object.entries(expenseCategories).filter(([_, cat]) => cat.actual > 0 || cat.forecasted > 0)
    );

    // totalIncome já é positivo, totalExpense já é positivo (valor absoluto)
    const incomeTotal = Object.values(filteredIncomeCategories).reduce((sum, cat) => sum + cat.actual, 0);
    const expenseTotal = Object.values(filteredExpenseCategories).reduce((sum, cat) => sum + cat.actual, 0);

    return {
      incomeTotals: filteredIncomeCategories,
      expenseTotals: filteredExpenseCategories,
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
      categoryTransactionsMap: new Map(Object.entries({ ...filteredIncomeCategories, ...filteredExpenseCategories }).map(([k, v]) => [k, v.transactions])),
    };
  }, [periodTransactions, forecasts, periodStart, categories]);

  // Saldo do Período = Saldo Anterior + Receitas - Despesas
  // previousBalance já considera todas as transações anteriores (receitas - despesas)
  // totalIncome é positivo, totalExpense é positivo (valor absoluto)
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
          <Collapsible open={incomeExpanded} onOpenChange={setIncomeExpanded}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors flex items-center justify-between">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas</h3>
                  {incomeExpanded ? (
                    <ChevronDown className="h-4 w-4 text-green-700 dark:text-green-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-green-700 dark:text-green-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[250px]">Categoria</TableHead>
                      <TableHead className="text-right w-[140px]">Previsto</TableHead>
                      <TableHead className="text-right w-[140px]">Realizado</TableHead>
                      <TableHead className="text-right w-[140px]">Diferença</TableHead>
                      <TableHead className="text-right w-[180px]">Progresso</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {Object.entries(incomeTotals).map(([categoryId, data]) => {
                  const difference = data.forecasted - data.actual;
                  const completion = data.forecasted > 0 
                    ? (data.actual / data.forecasted) * 100
                    : 0;
                  const percentage = data.forecasted !== 0 
                    ? ((difference / data.forecasted) * 100).toFixed(1)
                    : "-";
                  const hasTransactions = data.transactions.length > 0;
                  const isExpanded = expandedCategories.has(categoryId);

                  return (
                    <>
                      <TableRow key={categoryId} className={hasTransactions ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell className="w-[40px]" onClick={hasTransactions ? () => toggleCategoryExpansion(categoryId) : undefined}>
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                            {hasTransactions && (
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
                        </TableCell>
                        <TableCell className="w-[250px]" onClick={hasTransactions ? () => toggleCategoryExpansion(categoryId) : undefined}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: data.categoryColor }}
                            />
                            <span className="break-words">{data.categoryName}</span>
                            {hasTransactions && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">({data.transactions.length})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[140px]">
                          <span className="font-medium">{maskValue(formatCurrency(data.forecasted))}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium w-[140px]">
                          {maskValue(formatCurrency(data.actual))}
                        </TableCell>
                        <TableCell className={`text-right w-[140px] ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {maskValue(formatCurrency(difference))}
                        </TableCell>
                          <TableCell className="text-right w-[180px]">
                            <div className="space-y-1">
                              <div className="relative h-6 bg-muted rounded-full overflow-visible border-2"
                                style={{
                                  borderColor: completion > 100 
                                    ? 'rgb(220 38 38)' 
                                    : 'rgb(34 197 94)'
                                }}>
                                <div
                                  className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full border-2",
                                    completion > 100
                                      ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 border-red-600 dark:border-red-500"
                                      : "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 border-green-600 dark:border-green-500"
                                  )}
                                  style={{
                                    width: `${Math.min(completion, 150)}%`,
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                                </div>
                                
                                {completion > 100 && (
                                  <div
                                    className="absolute inset-y-0 w-0.5 bg-foreground z-10"
                                    style={{
                                      left: `${(100 / Math.min(completion, 150)) * 100}%`,
                                    }}
                                  />
                                )}
                                
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    {Math.round(completion)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                      </TableRow>
                      
                      {/* Subtabela de transações */}
                      {hasTransactions && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20 p-0">
                            <div className="pl-24 pr-6 py-2 animate-accordion-down">
                              <div className="border-l-2 border-primary/30 pl-6">
                                 {data.transactions.map((t) => {
                                   // Para transações de cartão, usar payment_month; caso contrário, usar date
                                   const displayDate = t.credit_card_id && t.payment_month 
                                     ? parseISO(t.payment_month as string)
                                     : parseISO(t.date);
                                   
                                   return (
                                     <div 
                                       key={t.id} 
                                       className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0"
                                     >
                                       <div className="flex items-center gap-3 flex-1 min-w-0">
                                         <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
                                           {format(displayDate, "dd/MM")}
                                         </span>
                                         <span className="text-sm truncate">{t.description}</span>
                                         {t.credit_card_id && t.credit_cards && (
                                           <span className="text-xs text-muted-foreground flex-shrink-0">
                                             ({t.credit_cards.name})
                                           </span>
                                         )}
                                       </div>
                                       <span className="text-sm font-medium flex-shrink-0 ml-4">
                                         {maskValue(formatCurrency(Number(t.amount)))}
                                       </span>
                                     </div>
                                   );
                                 })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                  <TableCell colSpan={2} className="text-right">Total de Receitas</TableCell>
                  <TableCell colSpan={4} className="text-right text-green-600">
                    {maskValue(formatCurrency(totalIncome))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
              </CollapsibleContent>
          </div>
          </Collapsible>
        )}

        {/* Despesas */}
        {Object.keys(expenseTotals).length > 0 && (
          <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between">
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas</h3>
                  {expenseExpanded ? (
                    <ChevronDown className="h-4 w-4 text-red-700 dark:text-red-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-red-700 dark:text-red-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[250px]">Categoria</TableHead>
                      <TableHead className="text-right w-[140px]">Previsto</TableHead>
                      <TableHead className="text-right w-[140px]">Realizado</TableHead>
                      <TableHead className="text-right w-[140px]">Diferença</TableHead>
                      <TableHead className="text-right w-[180px]">Progresso</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {Object.entries(expenseTotals).map(([categoryId, data]) => {
                    const difference = data.forecasted - data.actual;
                    const completion = data.forecasted > 0 
                      ? (data.actual / data.forecasted) * 100
                      : 0;
                    const percentage = data.forecasted !== 0 
                      ? ((difference / data.forecasted) * 100).toFixed(1)
                      : "-";
                  const hasTransactions = data.transactions.length > 0;
                  const isExpanded = expandedCategories.has(categoryId);

                  return (
                    <>
                      <TableRow key={categoryId} className={hasTransactions ? "cursor-pointer hover:bg-muted/50" : ""}>
                        <TableCell className="w-[40px]" onClick={hasTransactions ? () => toggleCategoryExpansion(categoryId) : undefined}>
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                            {hasTransactions && (
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
                        </TableCell>
                        <TableCell className="w-[250px]" onClick={hasTransactions ? () => toggleCategoryExpansion(categoryId) : undefined}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: data.categoryColor }}
                            />
                            <span className="break-words">{data.categoryName}</span>
                            {hasTransactions && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">({data.transactions.length})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[140px]">
                          <span className="font-medium">{maskValue(formatCurrency(data.forecasted))}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium w-[140px]">
                          {maskValue(formatCurrency(data.actual))}
                        </TableCell>
                        <TableCell className={`text-right w-[140px] ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {maskValue(formatCurrency(difference))}
                        </TableCell>
                        <TableCell className="text-right w-[180px]">
                          <div className="space-y-1">
                            <div className="relative h-6 bg-muted rounded-full overflow-visible border-2"
                              style={{
                                borderColor: completion > 100 
                                  ? 'rgb(220 38 38)' 
                                  : 'rgb(34 197 94)'
                              }}>
                              <div
                                className={cn(
                                  "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full border-2",
                                  completion > 100
                                    ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 border-red-600 dark:border-red-500"
                                    : "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 border-green-600 dark:border-green-500"
                                )}
                                style={{
                                  width: `${Math.min(completion, 150)}%`,
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
                              </div>
                              
                              {completion > 100 && (
                                <div
                                  className="absolute inset-y-0 w-0.5 bg-foreground z-10"
                                  style={{
                                    left: `${(100 / Math.min(completion, 150)) * 100}%`,
                                  }}
                                />
                              )}
                              
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                  {Math.round(completion)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Subtabela de transações */}
                      {hasTransactions && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20 p-0">
                            <div className="pl-24 pr-6 py-2 animate-accordion-down">
                              <div className="border-l-2 border-primary/30 pl-6">
                                 {data.transactions.map((t) => {
                                   // Para transações de cartão, usar payment_month; caso contrário, usar date
                                   const displayDate = t.credit_card_id && t.payment_month 
                                     ? parseISO(t.payment_month as string)
                                     : parseISO(t.date);
                                   
                                   return (
                                     <div 
                                       key={t.id} 
                                       className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0"
                                     >
                                       <div className="flex items-center gap-3 flex-1 min-w-0">
                                         <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
                                           {format(displayDate, "dd/MM")}
                                         </span>
                                         <span className="text-sm truncate">{t.description}</span>
                                         {t.credit_card_id && t.credit_cards && (
                                           <span className="text-xs text-muted-foreground flex-shrink-0">
                                             ({t.credit_cards.name})
                                           </span>
                                         )}
                                       </div>
                                       <span className="text-sm font-medium flex-shrink-0 ml-4">
                                         {maskValue(formatCurrency(Number(t.amount)))}
                                       </span>
                                     </div>
                                   );
                                 })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                  <TableCell colSpan={2} className="text-right">Total de Despesas</TableCell>
                  <TableCell colSpan={4} className="text-right text-destructive">
                    {maskValue(formatCurrency(totalExpense))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
              </CollapsibleContent>
          </div>
          </Collapsible>
        )}

        {/* Saldo Remanescente */}
        <Collapsible open={balanceExpanded} onOpenChange={setBalanceExpanded}>
          <div className="border rounded-lg overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="bg-blue-50 dark:bg-blue-950/20 px-4 py-2 border-b cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-blue-700 dark:text-blue-400">Saldo Remanescente</h3>
                {balanceExpanded ? (
                  <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[250px]">Descrição</TableHead>
                    <TableHead className="text-right w-[140px]">Previsto</TableHead>
                    <TableHead className="text-right w-[140px]">Realizado</TableHead>
                    <TableHead className="text-right w-[140px]">Diferença</TableHead>
                    <TableHead className="text-right w-[180px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-[40px]"></TableCell>
                    <TableCell className="w-[250px]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500" />
                        <span className="break-words">Saldo do período anterior</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right w-[140px]">-</TableCell>
                    <TableCell className="text-right font-medium w-[140px]">
                      {maskValue(formatCurrency(previousBalance))}
                    </TableCell>
                    <TableCell className="text-right w-[140px]">-</TableCell>
                    <TableCell className="text-right w-[180px]">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Saldo */}
        <div className="border rounded-lg bg-muted/50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Saldo:</span>
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
