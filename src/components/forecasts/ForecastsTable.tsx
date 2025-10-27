import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ForecastsTableProps {
  forecasts: any[];
  onEdit: (forecast: any) => void;
  onDelete: (id: string) => void;
  showAccountName?: boolean;
}

export function ForecastsTable({ forecasts, onEdit, onDelete, showAccountName }: ForecastsTableProps) {
  const [sortField, setSortField] = useState<'account' | 'category' | 'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const sortedForecasts = useMemo(() => {
    if (!sortField) return forecasts;
    
    return [...forecasts].sort((a, b) => {
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
  }, [forecasts, sortField, sortDirection]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (sortedForecasts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        Nenhuma previsão cadastrada para este mês
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {showAccountName && (
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('account')} className="flex items-center gap-1 p-0 h-auto font-medium">
                  Conta
                  {renderSortIcon('account')}
                </Button>
              </TableHead>
            )}
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                Categoria
                {renderSortIcon('category')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                Valor Previsto
                {renderSortIcon('amount')}
              </Button>
            </TableHead>
            <TableHead>Observações</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedForecasts.map((forecast) => (
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
              <TableCell className="text-right font-medium">
                {formatCurrency(Number(forecast.forecasted_amount))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {forecast.notes || "-"}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
