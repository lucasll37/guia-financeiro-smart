import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
}

export function ForecastsTable({ forecasts, onEdit, onDelete, showAccountName }: ForecastsTableProps) {
  const { formatCurrency } = useUserPreferences();
  const [sortField, setSortField] = useState<'account' | 'category' | 'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);

  const handleSort = (field: 'account' | 'category' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: 'account' | 'category' | 'amount') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Separar e ordenar previsões por tipo
  const { incomeForecasts, expenseForecasts, totalIncome, totalExpense } = useMemo(() => {
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
    
    const incomeTotal = income.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
    const expenseTotal = expense.reduce((sum, f) => sum + Number(f.forecasted_amount), 0);
    
    return {
      incomeForecasts: sortForecasts(income),
      expenseForecasts: sortForecasts(expense),
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
    };
  }, [forecasts, sortField, sortDirection]);

  const balance = totalIncome - totalExpense;

  const renderForecastRow = (forecast: any) => {
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(forecast)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(forecast.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
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
              <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas Previstas</h3>
                {incomeExpanded ? (
                  <ChevronDown className="h-4 w-4 text-green-700 dark:text-green-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-green-700 dark:text-green-400" />
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
              {incomeForecasts.map(renderForecastRow)}
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
              {expenseForecasts.map(renderForecastRow)}
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
