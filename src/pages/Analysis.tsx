import { useState, useMemo } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useForecasts } from "@/hooks/useForecasts";
import { ComparisonChart } from "@/components/analysis/ComparisonChart";
import { CategoryPieCharts } from "@/components/analysis/CategoryPieCharts";
import { CategoryStackedBarChart } from "@/components/analysis/CategoryStackedBarChart";
import { AnalysisFilters } from "@/components/analysis/AnalysisFilters";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Analysis() {
  const { accounts } = useAccounts();
  const [filters, setFilters] = useState({
    accountId: "all",
    viewMode: "monthly" as "monthly" | "custom",
    selectedMonth: format(new Date(), "yyyy-MM"),
    startDate: "",
    endDate: "",
  });

  const { categories } = useCategories(filters.accountId !== "all" ? filters.accountId : undefined);
  const { transactions } = useTransactions(filters.accountId !== "all" ? filters.accountId : undefined);
  const { forecasts } = useForecasts(filters.accountId !== "all" ? filters.accountId : undefined);

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
    if (!categories || filters.accountId === "all") return [];

    let periodStart: string;
    let periodEnd: string;

    if (filters.viewMode === "custom") {
      if (!filters.startDate || !filters.endDate) return [];
      periodStart = filters.startDate;
      periodEnd = filters.endDate;
    } else {
      periodStart = format(startOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd");
      periodEnd = format(endOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd");
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
  }, [categories, forecasts, transactions, filters]);

  const periodDates = useMemo(() => {
    if (filters.viewMode === "custom" && filters.startDate && filters.endDate) {
      return {
        start: filters.startDate,
        end: filters.endDate,
      };
    }
    return {
      start: format(startOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd"),
    };
  }, [filters]);

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

      <AnalysisFilters
        accounts={accounts || []}
        filters={filters}
        onFilterChange={setFilters}
      />

      {filters.accountId === "all" ? (
        <div className="text-center py-12 text-muted-foreground">
          Selecione uma conta para visualizar a análise
        </div>
      ) : (
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
            <TabsTrigger value="distribution">Distribuição</TabsTrigger>
            <TabsTrigger value="composition">Composição</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-6">
            <ComparisonChart data={comparisonData} accountId={filters.accountId} />
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            <CategoryPieCharts data={comparisonData} accountId={filters.accountId} />
          </TabsContent>

          <TabsContent value="composition" className="mt-6">
            <CategoryStackedBarChart
              accountId={filters.accountId}
              periodStart={periodDates.start}
              periodEnd={periodDates.end}
              parentCategories={comparisonData}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
