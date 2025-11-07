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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Visão Tabular - Previsões Anuais</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(y => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(y => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={!hasChanges || !canEdit}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar {hasChanges && `(${Object.keys(pendingChanges).length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 bg-background p-3 text-left font-medium min-w-[200px] border-r border-border">
                    Categoria
                  </th>
                  {MONTHS.map(monthIndex => (
                    <th key={monthIndex} className="p-3 text-center font-medium min-w-[100px] border-r border-border">
                      {format(new Date(selectedYear, monthIndex, 1), "MMM", { locale: ptBR })}
                    </th>
                  ))}
                  <th className="p-3 text-center font-medium min-w-[120px] bg-muted">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map(category => {
                  const parent = categories?.find(c => c.id === category.parent_id);
                  const categoryTotal = getCategoryTotal(category.id);
                  
                  return (
                    <tr key={category.id} className="border-b border-border hover:bg-muted/50">
                      <td className="sticky left-0 bg-background p-3 border-r border-border">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground truncate">
                              {parent?.name}
                            </div>
                            <div className="font-medium truncate">{category.name}</div>
                          </div>
                        </div>
                      </td>
                      {MONTHS.map(monthIndex => {
                        const key = `${category.id}-${monthIndex}`;
                        const value = getCellValue(category.id, monthIndex);
                        const isEditing = editingCell === key;
                        const isPending = key in pendingChanges;

                        return (
                          <td
                            key={monthIndex}
                            className={cn(
                              "p-1 text-center border-r border-border",
                              isPending && "bg-primary/10"
                            )}
                          >
                            {canEdit ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={isEditing ? undefined : value || ""}
                                onChange={(e) => handleCellChange(category.id, monthIndex, e.target.value)}
                                onFocus={() => setEditingCell(key)}
                                onBlur={() => setEditingCell(null)}
                                className="h-8 text-center border-0 bg-transparent"
                                disabled={!canEdit}
                              />
                            ) : (
                              <div className="h-8 flex items-center justify-center">
                                {value > 0 ? value.toFixed(2) : "-"}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-semibold bg-muted">
                        {categoryTotal > 0 ? categoryTotal.toFixed(2) : "-"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted font-semibold">
                  <td className="sticky left-0 bg-muted p-3 border-r border-border">
                    Total do Mês
                  </td>
                  {MONTHS.map(monthIndex => {
                    const total = getMonthTotal(monthIndex);
                    return (
                      <td key={monthIndex} className="p-3 text-center border-r border-border">
                        {total > 0 ? total.toFixed(2) : "-"}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center bg-primary text-primary-foreground">
                    {yearTotal > 0 ? yearTotal.toFixed(2) : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
