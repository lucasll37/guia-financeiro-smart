import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { ComparisonChart } from "@/components/analysis/ComparisonChart";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Analysis() {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const { categories } = useCategories(selectedAccountId !== "all" ? selectedAccountId : undefined);
  const { transactions } = useTransactions(selectedAccountId !== "all" ? selectedAccountId : undefined);
  const { forecasts } = useForecasts(selectedAccountId !== "all" ? selectedAccountId : undefined);

  // Generate month options (6 months before and after current month)
  const monthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (!categories || selectedAccountId === "all") return [];

    const periodStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");

    // Get forecasts for the period
    const periodForecasts = forecasts?.filter((f) => f.period_start === periodStart) || [];

    // Get transactions for the period
    const periodTransactions = transactions?.filter((t) => {
      const tDate = new Date(t.date);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return tDate >= start && tDate <= end;
    }) || [];

    // Group by category
    const categoryMap: Record<string, { name: string; color: string; forecasted: number; actual: number }> = {};

    // Add forecasts
    periodForecasts.forEach((f) => {
      const category = categories.find((c) => c.id === f.category_id);
      if (category) {
        categoryMap[f.category_id] = {
          name: category.name,
          color: category.color,
          forecasted: Number(f.forecasted_amount),
          actual: 0,
        };
      }
    });

    // Add actuals
    periodTransactions.forEach((t) => {
      if (!categoryMap[t.category_id]) {
        const category = categories.find((c) => c.id === t.category_id);
        if (category) {
          categoryMap[t.category_id] = {
            name: category.name,
            color: category.color,
            forecasted: 0,
            actual: 0,
          };
        }
      }
      if (categoryMap[t.category_id]) {
        categoryMap[t.category_id].actual += Number(t.amount);
      }
    });

    return Object.values(categoryMap);
  }, [categories, forecasts, transactions, selectedMonth, selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise</h1>
          <p className="text-muted-foreground">
            Compare seus gastos previstos com os realizados
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione a conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAccountId === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          Selecione uma conta para visualizar a análise
        </div>
      ) : (
        <ComparisonChart data={comparisonData} accountId={selectedAccountId} />
      )}
    </div>
  );
}
