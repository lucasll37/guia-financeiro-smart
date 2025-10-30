import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface ForecastsTableProps {
  forecasts: any[];
  onEdit: (forecast: any) => void;
  onDelete: (id: string) => void;
  showAccountName?: boolean;
  viewMode?: "monthly" | "custom";
  categories?: any[];
  canEdit?: boolean;
  accountType?: string;
  revenueHeaderActions?: React.ReactNode;
}

export function ForecastsTable({ forecasts, onEdit, onDelete, showAccountName, viewMode = "monthly", categories = [], canEdit = true, accountType, revenueHeaderActions }: ForecastsTableProps) {
  const { formatCurrency } = useUserPreferences();
  const [sortField, setSortField] = useState<'account' | 'category' | 'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const handleSort = (field: 'account' | 'category' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderSortIcon = (field: 'account' | 'category' | 'amount') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Separar e ordenar previsões por tipo e agrupar por categoria pai no modo custom
  const { incomeForecasts, expenseForecasts, totalIncome, totalExpense, incomeByParent, expenseByParent } = useMemo(() => {
    const income = forecasts.filter((f) => f.categories?.type === "receita");
    const expense = forecasts.filter((f) => f.categories?.type === "despesa");
    
    const sortForecasts = (fcs: any[]) => {
      if (!sortField) return fcs;
      
      return [...fcs].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'account') {
          const aName = (a.accounts as any)?.name || '';
          const bName = (b.accounts as any)?.name || '';
          comparison = aName.localeCompare(bName);
        } else if (sortField === 'category') {
          const aName = (a.categories as any)?.name || '';
          const bName = (b.categories as any)?.name || '';
          comparison = aName.localeCompare(bName);
        } else if (sortField === 'amount') {
          comparison = Number(a.forecasted_amount) - Number(b.forecasted_amount);
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    };
    
    // Agrupar por categoria pai no modo custom
    const groupByParent = (fcs: any[]) => {
      const grouped: Record<string, { parent: any; children: any[]; total: number }> = {};
      
      fcs.forEach(forecast => {
        const category = forecast.categories;
        const parentId = category?.parent_id || forecast.category_id;
        
        if (!grouped[parentId]) {
          const parentCategory = category?.parent_id 
            ? categories.find(c => c.id === category.parent_id)
            : category;
          
          grouped[parentId] = {
            parent: parentCategory || category,
            children: [],
            total: 0
          };
        }
        
        grouped[parentId].children.push(forecast);
        grouped[parentId].total += Number(forecast.forecasted_amount);
      });
      
      return grouped;
    };
    
    const incomeTotal = income.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
    const expenseTotal = expense.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
    
    return {
      incomeForecasts: sortForecasts(income),
      expenseForecasts: sortForecasts(expense),
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
      incomeByParent: viewMode === "custom" ? groupByParent(income) : {},
      expenseByParent: viewMode === "custom" ? groupByParent(expense) : {},
    };
  }, [forecasts, sortField, sortDirection, viewMode, categories]);

  const balance = totalIncome - totalExpense;

  const renderForecastRow = (forecast: any) => {
    const isCasaRevenue = accountType === "casa" && forecast.categories?.type === "receita";
    
    return (
      <TableRow key={forecast.id}>
        {showAccountName && (
          <TableCell className="font-medium">
            {(forecast.accounts as any)?.name || "Sem conta"}
          </TableCell>
        )}
        <TableCell>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: (forecast.categories as any)?.color || "#6366f1" }}
            />
            <span>{(forecast.categories as any)?.name || "Sem categoria"}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {forecast.notes || "-"}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(Number(forecast.forecasted_amount))}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {!isCasaRevenue && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(forecast)}
                  disabled={!canEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(forecast.id)}
                  disabled={!canEdit}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderGroupedForecasts = (groupedData: Record<string, { parent: any; children: any[]; total: number }>) => {
    return Object.entries(groupedData).map(([parentId, data]) => {
      const isExpanded = expandedCategories.has(parentId);
      
      return (
        <>
          {/* Categoria Pai */}
          <TableRow 
            key={parentId} 
            className="cursor-pointer hover:bg-muted/50 font-medium"
            onClick={() => toggleCategoryExpansion(parentId)}
          >
            {showAccountName && <TableCell />}
            <TableCell>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpansion(parentId);
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: data.parent?.color || "#6366f1" }}
                />
                <span>{data.parent?.name || "Sem categoria"}</span>
                <span className="text-xs text-muted-foreground">({data.children.length})</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {/* Vazio para categorias agrupadas */}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(data.total)}
            </TableCell>
            <TableCell className="text-right">
              {/* Ações disponíveis apenas nas subcategorias */}
            </TableCell>
          </TableRow>
          
          {/* Subcategorias */}
          {isExpanded && data.children.map((forecast) => {
            const isCasaRevenue = accountType === "casa" && forecast.categories?.type === "receita";
            
            return (
              <TableRow key={forecast.id} className="bg-muted/20">
                {showAccountName && <TableCell />}
                <TableCell className="pl-12">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-8 bg-primary/30 ml-2" />
                    <span className="text-sm">
                      {format(new Date(forecast.period_start), "MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {forecast.notes || "-"}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(Number(forecast.forecasted_amount))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!isCasaRevenue && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(forecast)}
                          disabled={!canEdit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(forecast.id)}
                          disabled={!canEdit}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </>
      );
    });
  };

  if (forecasts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        Nenhuma previsão cadastrada para este mês
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Receitas */}
      {incomeForecasts.length > 0 && (
        <Collapsible open={incomeExpanded} onOpenChange={setIncomeExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-green-50 dark:bg-green-950/20 px-4 py-3 border-b cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas Previstas</h3>
                  {revenueHeaderActions}
                </div>
                <div className="flex items-center gap-2">
                  {incomeExpanded ? (
                    <ChevronDown className="h-4 w-4 text-green-700 dark:text-green-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-green-700 dark:text-green-400" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ResponsiveTable>
            <TableHeader>
              <TableRow>
                {showAccountName && (
                  <TableHead className="w-[150px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('account')} className="flex items-center gap-1 p-0 h-auto font-medium">
                      Conta
                      {renderSortIcon('account')}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor Previsto
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === "custom" && Object.keys(incomeByParent).length > 0
                ? renderGroupedForecasts(incomeByParent)
                : incomeForecasts.map(renderForecastRow)}
               <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                <TableCell colSpan={showAccountName ? 2 : 1} className="text-right">
                  Total de Receitas:
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-green-600">
                  + {formatCurrency(totalIncome)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </ResponsiveTable>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Despesas */}
      {expenseForecasts.length > 0 && (
        <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas Previstas</h3>
                {expenseExpanded ? (
                  <ChevronDown className="h-4 w-4 text-red-700 dark:text-red-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-red-700 dark:text-red-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ResponsiveTable>
            <TableHeader>
              <TableRow>
                {showAccountName && (
                  <TableHead className="w-[150px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('account')} className="flex items-center gap-1 p-0 h-auto font-medium">
                      Conta
                      {renderSortIcon('account')}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor Previsto
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === "custom" && Object.keys(expenseByParent).length > 0
                ? renderGroupedForecasts(expenseByParent)
                : expenseForecasts.map(renderForecastRow)}
               <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                <TableCell colSpan={showAccountName ? 2 : 1} className="text-right">
                  Total de Despesas:
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-destructive">
                  - {formatCurrency(totalExpense)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </ResponsiveTable>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Saldo */}
      {(incomeForecasts.length > 0 || expenseForecasts.length > 0) && (
        <div className="border rounded-lg bg-muted/50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Saldo Previsto:</span>
              <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
