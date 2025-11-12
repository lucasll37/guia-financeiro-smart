import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useForecasts } from "@/hooks/useForecasts";
import { useCategories } from "@/hooks/useCategories";
import { useAccountEditPermissions } from "@/hooks/useAccountEditPermissions";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface TabularYearViewProps {
  accountId: string;
  accountType?: string;
}

interface CellData {
  forecastId?: string;
  categoryId: string;
  month: Date;
  amount: number;
  notes?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export function TabularYearView({ accountId, accountType }: TabularYearViewProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, CellData>>({});

  const { categories, isLoading: categoriesLoading } = useCategories(accountId);
  const { forecasts, isLoading: forecastsLoading, createForecast, updateForecast } = useForecasts(accountId);
  const { data: canEdit = false } = useAccountEditPermissions(accountId);

  // Separate revenue and expense categories
  const revenueCategories = useMemo(() => {
    if (!categories || accountType === "casa") return [];
    return categories.filter(c => c.parent_id && c.type === "receita");
  }, [categories, accountType]);

  const expenseSubcategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => c.parent_id && c.type === "despesa");
  }, [categories]);

  // Group expense subcategories by parent
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { parent: any; children: any[] }> = {};
    expenseSubcategories.forEach(cat => {
      const parent = categories?.find(p => p.id === cat.parent_id);
      if (parent) {
        if (!groups[parent.id]) {
          groups[parent.id] = { parent, children: [] };
        }
        groups[parent.id].children.push(cat);
      }
    });
    return Object.values(groups);
  }, [expenseSubcategories, categories]);

  // Create a map of forecasts by category and month
  const forecastMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (!forecasts) return map;

    forecasts.forEach(f => {
      const date = new Date(f.period_start);
      if (date.getFullYear() === selectedYear) {
        const key = `${f.category_id}-${date.getMonth()}`;
        map[key] = f;
      }
    });
    return map;
  }, [forecasts, selectedYear]);

  // Initialize cell values from forecasts
  useEffect(() => {
    const values: Record<string, number> = {};
    Object.entries(forecastMap).forEach(([key, forecast]) => {
      values[key] = forecast.forecasted_amount;
    });
    setCellValues(values);
    setPendingChanges({});
  }, [forecastMap]);

  const handleCellChange = (categoryId: string, monthIndex: number, value: string) => {
    const key = `${categoryId}-${monthIndex}`;
    const numValue = parseFloat(value) || 0;
    
    setCellValues(prev => ({ ...prev, [key]: numValue }));
    
    const monthDate = new Date(selectedYear, monthIndex, 1);
    const existingForecast = forecastMap[key];
    
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        forecastId: existingForecast?.id,
        categoryId,
        month: monthDate,
        amount: numValue,
        notes: existingForecast?.notes,
      }
    }));
  };

  const handleSaveAll = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Não há alterações para salvar",
      });
      return;
    }

    try {
      for (const change of Object.values(pendingChanges)) {
        const periodStart = format(startOfMonth(change.month), "yyyy-MM-dd");
        const periodEnd = format(endOfMonth(change.month), "yyyy-MM-dd");

        if (change.forecastId) {
          // Update existing
          await updateForecast.mutateAsync({
            id: change.forecastId,
            forecasted_amount: change.amount,
          });
        } else if (change.amount > 0) {
          // Create new only if amount > 0
          await createForecast.mutateAsync({
            account_id: accountId,
            category_id: change.categoryId,
            period_start: periodStart,
            period_end: periodEnd,
            forecasted_amount: change.amount,
          });
        }
      }

      setPendingChanges({});
      toast({
        title: "Previsões salvas",
        description: `${Object.keys(pendingChanges).length} alteração(ões) salva(s) com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCellValue = (categoryId: string, monthIndex: number): number => {
    const key = `${categoryId}-${monthIndex}`;
    return cellValues[key] ?? 0;
  };

  const formatCurrency = (value: number): string => {
    if (value === 0) return "-";
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const getRevenueMonthTotal = (monthIndex: number) => {
    return revenueCategories.reduce((sum, cat) => sum + getCellValue(cat.id, monthIndex), 0);
  };

  const getExpenseMonthTotal = (monthIndex: number) => {
    return expenseSubcategories.reduce((sum, cat) => sum + getCellValue(cat.id, monthIndex), 0);
  };

  const getCategoryTotal = (categoryId: string) => {
    return MONTHS.reduce((sum, monthIndex) => sum + getCellValue(categoryId, monthIndex), 0);
  };

  const getParentTotal = (parentId: string, monthIndex: number) => {
    const children = groupedExpenses.find(g => g.parent.id === parentId)?.children || [];
    return children.reduce((sum, cat) => sum + getCellValue(cat.id, monthIndex), 0);
  };

  const getParentYearTotal = (parentId: string) => {
    return MONTHS.reduce((sum, monthIndex) => sum + getParentTotal(parentId, monthIndex), 0);
  };

  const revenueYearTotal = MONTHS.reduce((sum, monthIndex) => sum + getRevenueMonthTotal(monthIndex), 0);
  const expenseYearTotal = MONTHS.reduce((sum, monthIndex) => sum + getExpenseMonthTotal(monthIndex), 0);

  if (categoriesLoading || forecastsLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card className="p-6 flex flex-col max-h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(10)].map((_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={handleSaveAll} disabled={!hasChanges || !canEdit} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Tudo
        </Button>
      </div>

      <div className="space-y-6 overflow-y-auto flex-1">
        {/* REVENUE SECTION */}
        {accountType !== "casa" && revenueCategories.length > 0 && (
          <div className="overflow-x-auto xl:overflow-visible">
            <table className="w-full border-collapse border border-border text-sm">
              <thead className="sticky top-0 z-30 bg-teal-500">
                <tr>
                  <th className="border border-border px-2 py-1.5 bg-teal-500 text-white text-left font-semibold min-w-[160px]">
                    Receita
                  </th>
                  {MONTHS.map((monthIndex) => (
                    <th key={monthIndex} className="border border-border px-2 py-1.5 bg-teal-500 text-white text-center font-semibold min-w-[85px]">
                      {format(new Date(selectedYear, monthIndex, 1), "MMM", { locale: ptBR })}
                    </th>
                  ))}
                  <th className="border border-border px-2 py-1.5 bg-teal-500 text-white text-center font-semibold min-w-[90px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueCategories.map((category, idx) => (
                  <tr key={category.id} className={idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-gray-50 dark:bg-muted/20"}>
                    <td className="border border-border px-2 py-1 font-medium">
                      {category.name}
                    </td>
                    {MONTHS.map((monthIndex) => {
                      const cellKey = `${category.id}-${monthIndex}`;
                      const value = getCellValue(category.id, monthIndex);
                      return (
                        <td key={cellKey} className="border border-border p-0">
                          {canEdit ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={value || ""}
                              onChange={(e) => handleCellChange(category.id, monthIndex, e.target.value)}
                              className="w-full h-full text-right border-0 rounded-none focus-visible:ring-1 focus-visible:ring-primary bg-transparent px-1.5 py-1 text-sm"
                              placeholder="-"
                            />
                          ) : (
                            <div className="text-right px-2 py-1">
                              {formatCurrency(value)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-border px-2 py-1 bg-gray-100 dark:bg-muted/40 text-right font-semibold">
                      {formatCurrency(getCategoryTotal(category.id))}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-teal-600 text-white">
                  <td className="border border-border px-2 py-1.5">
                    Total Receita
                  </td>
                  {MONTHS.map((monthIndex) => (
                    <td key={monthIndex} className="border border-border px-2 py-1.5 text-right">
                      {formatCurrency(getRevenueMonthTotal(monthIndex))}
                    </td>
                  ))}
                  <td className="border border-border px-2 py-1.5 text-right">
                    {formatCurrency(revenueYearTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* EXPENSE SECTION */}
        <div className="overflow-x-auto xl:overflow-visible">
          <table className="w-full border-collapse border border-border text-sm">
            <thead className="sticky top-0 z-30 bg-teal-500">
              <tr>
                <th className="border border-border px-2 py-1.5 bg-teal-500 text-white text-left font-semibold min-w-[160px]">
                  Despesa
                </th>
                {MONTHS.map((monthIndex) => (
                  <th key={monthIndex} className="border border-border px-2 py-1.5 bg-teal-500 text-white text-center font-semibold min-w-[85px]">
                    {format(new Date(selectedYear, monthIndex, 1), "MMM", { locale: ptBR })}
                  </th>
                ))}
                <th className="border border-border px-2 py-1.5 bg-teal-500 text-white text-center font-semibold min-w-[90px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedExpenses.map((group, groupIdx) => (
                <React.Fragment key={group.parent.id}>
                  {group.children.map((category, idx) => (
                    <tr key={category.id} className={idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-gray-50 dark:bg-muted/20"}>
                      <td className="border border-border px-2 py-1 font-medium pl-4">
                        {category.name}
                      </td>
                      {MONTHS.map((monthIndex) => {
                        const cellKey = `${category.id}-${monthIndex}`;
                        const value = getCellValue(category.id, monthIndex);
                        return (
                          <td key={cellKey} className="border border-border p-0">
                            {canEdit ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={value || ""}
                                onChange={(e) => handleCellChange(category.id, monthIndex, e.target.value)}
                                className="w-full h-full text-right border-0 rounded-none focus-visible:ring-1 focus-visible:ring-primary bg-transparent px-1.5 py-1 text-sm"
                                placeholder="-"
                              />
                            ) : (
                              <div className="text-right px-2 py-1">
                                {formatCurrency(value)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-border px-2 py-1 bg-gray-100 dark:bg-muted/40 text-right font-semibold">
                        {formatCurrency(getCategoryTotal(category.id))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-amber-200 to-amber-100 dark:from-amber-900 dark:to-amber-800 font-bold">
                    <td className="border border-border px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: group.parent.color }} />
                        <span className="text-amber-900 dark:text-amber-50">Subtotal {group.parent.name}</span>
                      </div>
                    </td>
                    {MONTHS.map((monthIndex) => (
                      <td key={monthIndex} className="border border-border px-2 py-1.5 text-right text-amber-900 dark:text-amber-50">
                        {formatCurrency(getParentTotal(group.parent.id, monthIndex))}
                      </td>
                    ))}
                    <td className="border border-border px-2 py-1.5 text-right text-amber-900 dark:text-amber-50">
                      {formatCurrency(getParentYearTotal(group.parent.id))}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              <tr className="font-bold bg-teal-600 text-white">
                <td className="border border-border px-2 py-1.5">
                  Total Despesa
                </td>
                {MONTHS.map((monthIndex) => (
                  <td key={monthIndex} className="border border-border px-2 py-1.5 text-right">
                    {formatCurrency(getExpenseMonthTotal(monthIndex))}
                  </td>
                ))}
                <td className="border border-border px-2 py-1.5 text-right">
                  {formatCurrency(expenseYearTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
