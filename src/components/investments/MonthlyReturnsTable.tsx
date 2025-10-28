import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

interface MonthlyReturnsTableProps {
  returns: MonthlyReturn[];
  onEdit: (returnData: MonthlyReturn) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  investmentName: string;
}

export function MonthlyReturnsTable({
  returns,
  onEdit,
  onDelete,
  onNew,
  investmentName,
}: MonthlyReturnsTableProps) {
  const [sortField, setSortField] = useState<'month' | 'return' | 'contribution' | 'balance' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'month' | 'return' | 'contribution' | 'balance') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: 'month' | 'return' | 'contribution' | 'balance') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedReturnsWithPV = useMemo(() => {
    const sorted = !sortField ? returns : [...returns].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'month') {
        comparison = a.month.localeCompare(b.month);
      } else if (sortField === 'return') {
        comparison = Number(a.actual_return) - Number(b.actual_return);
      } else if (sortField === 'contribution') {
        comparison = Number(a.contribution) - Number(b.contribution);
      } else if (sortField === 'balance') {
        comparison = Number(a.balance_after) - Number(b.balance_after);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Calcular valor presente e aportes acumulados para cada rendimento
    let cumulativeInflation = 0;
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;
    
    return sorted.map((returnData, index) => {
      const inflationRate = Number(returnData.inflation_rate) / 100;
      const contribution = Number(returnData.contribution);
      
      cumulativeInflation = (1 + cumulativeInflation) * (1 + inflationRate) - 1;
      const presentValue = Number(returnData.balance_after) / (1 + cumulativeInflation);
      
      cumulativeContribution += contribution;
      // Aporte em valor presente (o aporte já foi feito, então mantém o valor no momento)
      cumulativeContributionPV += contribution;
      
      return {
        ...returnData,
        presentValue,
        cumulativeContribution,
        cumulativeContributionPV,
      };
    });
  }, [returns, sortField, sortDirection]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatMonthLabel = (dateStr: string) => {
    const [y, m] = String(dateStr).split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rendimentos Mensais - {investmentName}</CardTitle>
        <Button onClick={onNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Rendimento
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('month')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Mês/Ano
                    {renderSortIcon('month')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('return')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Rendimento
                    {renderSortIcon('return')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Inflação (%)</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('contribution')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Aporte
                    {renderSortIcon('contribution')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Aporte Acum. Aparente</TableHead>
                <TableHead className="text-right">Aporte Acum. Real</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('balance')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Saldo Aparente
                    {renderSortIcon('balance')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Saldo Valor Presente</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReturnsWithPV.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum rendimento registrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedReturnsWithPV.map((returnData) => (
                  <TableRow key={returnData.id}>
                    <TableCell className="font-medium">
                      {formatMonthLabel(returnData.month)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          Number(returnData.actual_return) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {Number(returnData.actual_return).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(returnData.inflation_rate).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          Number(returnData.contribution) < 0
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {formatCurrency(Number(returnData.contribution))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(returnData.cumulativeContribution)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(returnData.cumulativeContributionPV)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(returnData.balance_after))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(returnData.presentValue)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {returnData.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(returnData)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(returnData.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
