import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useForecasts } from "@/hooks/useForecasts";
import { useCategories } from "@/hooks/useCategories";
import { useAccountEditPermissions } from "@/hooks/useAccountEditPermissions";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValues, setCellValues] = useState<Record<string, number>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, CellData>>({});

  const { categories, isLoading: categoriesLoading } = useCategories(accountId);
  const { forecasts, isLoading: forecastsLoading, createForecast, updateForecast } = useForecasts(accountId);
  const { data: canEdit = false } = useAccountEditPermissions(accountId);

  // Filter only expense categories for casa type, all for others
  const subcategories = useMemo(() => {
    if (!categories) return [];
    const filtered = accountType === "casa" 
      ? categories.filter(c => c.parent_id && c.type === "despesa")
      : categories.filter(c => c.parent_id);
    return filtered.sort((a, b) => {
      const parentA = categories.find(p => p.id === a.parent_id)?.name || "";
      const parentB = categories.find(p => p.id === b.parent_id)?.name || "";
      if (parentA !== parentB) return parentA.localeCompare(parentB);
      return a.name.localeCompare(b.name);
    });
  }, [categories, accountType]);

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

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const getMonthTotal = (monthIndex: number) => {
    return subcategories.reduce((sum, cat) => {
      return sum + getCellValue(cat.id, monthIndex);
    }, 0);
  };

  const getCategoryTotal = (categoryId: string) => {
    return MONTHS.reduce((sum, monthIndex) => {
      return sum + getCellValue(categoryId, monthIndex);
    }, 0);
  };

  const yearTotal = MONTHS.reduce((sum, monthIndex) => sum + getMonthTotal(monthIndex), 0);

  if (categoriesLoading || forecastsLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(prev => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(prev => prev + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          onClick={handleSaveAll} 
          disabled={!hasChanges || !canEdit}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Salvar Tudo
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border p-3 bg-teal-600 text-white text-left font-semibold sticky left-0 z-20 min-w-[200px]">
                Categoria
              </th>
              {MONTHS.map((monthIndex) => (
                <th key={monthIndex} className="border border-border p-3 bg-teal-600 text-white text-center font-semibold min-w-[100px]">
                  {format(new Date(selectedYear, monthIndex, 1), "MMMM", { locale: ptBR })}
                </th>
              ))}
              <th className="border border-border p-3 bg-teal-700 text-white text-center font-semibold min-w-[120px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {subcategories.map((category, rowIndex) => (
              <tr key={category.id} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                <td className="border border-border p-2 sticky left-0 z-10 font-medium bg-inherit">
                  {category.name}
                </td>
                {MONTHS.map((monthIndex) => {
                  const cellKey = `${category.id}-${monthIndex}`;
                  return (
                    <td key={cellKey} className="border border-border p-0">
                      {canEdit ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={getCellValue(category.id, monthIndex) || ""}
                          onChange={(e) => handleCellChange(category.id, monthIndex, e.target.value)}
                          className="w-full h-full text-right border-0 rounded-none focus-visible:ring-1 focus-visible:ring-primary bg-transparent px-2 py-2"
                          placeholder="0.00"
                        />
                      ) : (
                        <div className="text-right px-3 py-2">
                          {parseFloat(getCellValue(category.id, monthIndex).toString() || "0").toFixed(2)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border border-border p-2 bg-muted text-right font-semibold">
                  {getCategoryTotal(category.id).toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-teal-50 dark:bg-teal-950">
              <td className="border border-border p-3 sticky left-0 z-10 bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100">
                Total
              </td>
              {MONTHS.map((monthIndex) => (
                <td key={monthIndex} className="border border-border p-3 text-right text-teal-900 dark:text-teal-100">
                  {getMonthTotal(monthIndex).toFixed(2)}
                </td>
              ))}
              <td className="border border-border p-3 bg-teal-100 dark:bg-teal-900 text-right text-teal-900 dark:text-teal-100">
                {yearTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
