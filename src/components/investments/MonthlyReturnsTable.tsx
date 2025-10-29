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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

interface MonthlyReturnsTableProps {
  returns: MonthlyReturn[];
  onEdit?: (returnData: MonthlyReturn) => void;
  onDelete?: (id: string) => void;
  onNew?: () => void;
  investmentName: string;
  readOnly?: boolean;
}

export function MonthlyReturnsTable({
  returns,
  onEdit,
  onDelete,
  onNew,
  investmentName,
  readOnly = false,
}: MonthlyReturnsTableProps) {
  const [sortField, setSortField] = useState<'month' | 'return' | 'contribution' | 'balance' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const { maskValue } = useMaskValues();
  const isMobile = useIsMobile();

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

    // Calcular inflação acumulada e aportes totais
    let inflationAccumulator = 1;
    let totalContributions = 0;
    
    return sorted.map((returnData) => {
      const inflationRate = Number(returnData.inflation_rate) / 100;
      const contribution = Number(returnData.contribution);
      
      // Acumular inflação multiplicativamente
      inflationAccumulator *= (1 + inflationRate);
      const cumulativeInflationPercent = (inflationAccumulator - 1) * 100;
      
      // Somar aportes
      totalContributions += contribution;
      
      // Valor absoluto da inflação acumulada = Total de Aportes * (Inflação Acumulada %)
      const cumulativeInflationValue = totalContributions * (cumulativeInflationPercent / 100);
      
      return {
        ...returnData,
        cumulativeInflationValue,
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
        {!readOnly && onNew && (
          <Button onClick={onNew} size="sm">
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Registrar Rendimento</span>}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Info className="h-4 w-4 mr-2" />
              {isExplanationOpen ? "Ocultar" : "Mostrar"} Explicação dos Termos
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 p-4 bg-muted rounded-lg space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1.5">📊 Saldo Aparente</h4>
              <p className="text-muted-foreground mb-2">
                É o montante nominal acumulado no investimento. Representa quanto dinheiro você tem "no papel", 
                mas não reflete o poder de compra real.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border">
                Saldo Aparente = Saldo Anterior + Aporte + Rendimento
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">📉 Inflação Acumulada</h4>
              <p className="text-muted-foreground mb-2">
                Mostra o valor em reais que a inflação "corroeu" dos seus aportes desde o início do investimento. 
                É calculado aplicando a inflação acumulada percentual sobre o total de aportes realizados.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border">
                Inflação Acumulada (R$) = Total de Aportes × Inflação Acumulada (%)
              </p>
            </div>

            <div className="pt-3 bg-primary/5 -m-4 mt-4 p-4 rounded-b-lg">
              <h4 className="font-semibold mb-1.5 flex items-center gap-2">
                <span>💡</span> Por que é importante?
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                A inflação acumulada em reais mostra concretamente quanto do seu poder de compra foi perdido pela inflação. 
                Para ter ganho real, o rendimento do investimento precisa superar esse valor.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('balance')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Saldo Aparente
                    {renderSortIcon('balance')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Inflação Acumulada</TableHead>
                <TableHead>Observações</TableHead>
                {!readOnly && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReturnsWithPV.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
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
                        {maskValue(`${Number(returnData.actual_return).toFixed(2)}%`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {maskValue(`${Number(returnData.inflation_rate).toFixed(2)}%`)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          Number(returnData.contribution) < 0
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {maskValue(formatCurrency(Number(returnData.contribution)))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {maskValue(formatCurrency(Number(returnData.balance_after)))}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      -{maskValue(formatCurrency(returnData.cumulativeInflationValue))}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {returnData.notes || "-"}
                    </TableCell>
                    {!readOnly && onEdit && onDelete && (
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
                    )}
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
