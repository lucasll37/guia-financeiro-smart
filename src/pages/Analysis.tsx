import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { ComparisonChart } from "@/components/analysis/ComparisonChart";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Analysis() {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [periodType, setPeriodType] = useState<"month" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

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

  // Helper to get parent category
  const getParentCategory = (categoryId: string) => {
    const category = categories?.find((c) => c.id === categoryId);
    if (!category) return null;
    
    // If has parent, return parent category
    if (category.parent_id) {
      return categories?.find((c) => c.id === category.parent_id) || category;
    }
    
    // Otherwise, it's already a parent category
    return category;
  };

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (!categories || selectedAccountId === "all") return [];

    let periodStart: string;
    let periodEnd: string;

    if (periodType === "custom") {
      if (!customStartDate || !customEndDate) return [];
      periodStart = format(customStartDate, "yyyy-MM-dd");
      periodEnd = format(customEndDate, "yyyy-MM-dd");
    } else {
      periodStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
      periodEnd = format(endOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
    }

    // Get forecasts for the period
    const periodForecasts = forecasts?.filter((f) => f.period_start === periodStart) || [];

    // Get transactions for the period
    const periodTransactions = transactions?.filter((t) => {
      const tDate = new Date(t.date);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return tDate >= start && tDate <= end;
    }) || [];

    // Group by parent category
    const categoryMap: Record<string, { name: string; color: string; forecasted: number; actual: number }> = {};

    // Add forecasts (group by parent)
    periodForecasts.forEach((f) => {
      const parentCategory = getParentCategory(f.category_id);
      if (parentCategory) {
        if (!categoryMap[parentCategory.id]) {
          categoryMap[parentCategory.id] = {
            name: parentCategory.name,
            color: parentCategory.color,
            forecasted: 0,
            actual: 0,
          };
        }
        categoryMap[parentCategory.id].forecasted += Number(f.forecasted_amount);
      }
    });

    // Add actuals (group by parent)
    periodTransactions.forEach((t) => {
      const parentCategory = getParentCategory(t.category_id);
      if (parentCategory) {
        if (!categoryMap[parentCategory.id]) {
          categoryMap[parentCategory.id] = {
            name: parentCategory.name,
            color: parentCategory.color,
            forecasted: 0,
            actual: 0,
          };
        }
        categoryMap[parentCategory.id].actual += Number(t.amount);
      }
    });

    return Object.values(categoryMap);
  }, [categories, forecasts, transactions, selectedMonth, selectedAccountId, periodType, customStartDate, customEndDate]);

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

      <div className="flex flex-wrap gap-4">
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

        <Select value={periodType} onValueChange={(v) => setPeriodType(v as "month" | "custom")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Por mês</SelectItem>
            <SelectItem value="custom">Período personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodType === "month" ? (
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
        ) : (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </>
        )}
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
