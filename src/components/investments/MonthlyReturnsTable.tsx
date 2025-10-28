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
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

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

    // Calcular inflação acumulada e valores presentes
    // Fórmula: VP = VF / (1 + inflação_acumulada)
    // Inflação acumulada = (1 + i1) × (1 + i2) × ... × (1 + in) - 1
    let inflationAccumulator = 1; // Começa em 1 para multiplicação
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;
    
    return sorted.map((returnData) => {
      const inflationRate = Number(returnData.inflation_rate) / 100;
      const contribution = Number(returnData.contribution);
      
      // Acumular inflação multiplicativamente
      inflationAccumulator *= (1 + inflationRate);
      const cumulativeInflation = inflationAccumulator - 1;
      
      // Saldo VP = Saldo Aparente / (1 + Inflação Acumulada)
      const presentValue = Number(returnData.balance_after) / (1 + cumulativeInflation);
      
      // Aportes aparentes: soma simples
      cumulativeContribution += contribution;
      
      // Aportes VP: para aportes já realizados, mantém o valor no momento da aplicação
      // Não descontamos para o passado, apenas somamos
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
      <CardContent className="space-y-4">
        <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Info className="h-4 w-4 mr-2" />
              {isExplanationOpen ? "Ocultar" : "Mostrar"} Explicação dos Termos
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 p-4 bg-muted rounded-lg space-y-4 text-sm">
            <div className="pb-3 border-b border-border">
              <h4 className="font-semibold text-base mb-2 text-primary">💰 Valores Aparentes (Nominais)</h4>
              <p className="text-muted-foreground mb-3">
                São os valores "de face" que aparecem no extrato, sem considerar a perda de poder de compra pela inflação.
              </p>
            </div>
            
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
              <h4 className="font-semibold mb-1.5">💵 Aporte Acumulado Aparente</h4>
              <p className="text-muted-foreground mb-2">
                É a soma simples de todos os depósitos que você fez ao longo do tempo, sem ajustes pela inflação.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border">
                Aporte Acum. Aparente = Σ Aportes Mensais
              </p>
            </div>

            <div className="pb-3 border-b border-border pt-2">
              <h4 className="font-semibold text-base mb-2 text-chart-2">💎 Valores Presentes (Reais)</h4>
              <p className="text-muted-foreground mb-3">
                São os valores ajustados pela inflação, mostrando o poder de compra efetivo em relação ao início do investimento.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">📈 Saldo VP (Valor Presente)</h4>
              <p className="text-muted-foreground mb-2">
                É quanto o seu saldo vale em termos de poder de compra do primeiro mês. Mostra se você realmente 
                ganhou poder de compra ou apenas acompanhou a inflação.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border mb-1">
                Saldo VP = Saldo Aparente / (1 + Inflação Acumulada)
              </p>
              <p className="text-xs text-muted-foreground italic">
                Inflação Acumulada = (1 + i₁) × (1 + i₂) × ... × (1 + iₙ) - 1
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">💰 Aporte Acumulado VP</h4>
              <p className="text-muted-foreground mb-2">
                Para aportes já realizados (histórico), mantemos o valor no momento em que foram feitos. 
                Não descontamos para o passado, apenas somamos os valores investidos.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border">
                Aporte Acum. VP = Σ Aportes (valor no momento da aplicação)
              </p>
            </div>

            <div className="pt-3 bg-primary/5 -m-4 mt-4 p-4 rounded-b-lg">
              <h4 className="font-semibold mb-1.5 flex items-center gap-2">
                <span>💡</span> Por que é importante?
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Comparar o <strong>Saldo Aparente</strong> com o <strong>Saldo VP</strong> mostra se seu investimento 
                está realmente gerando ganho real acima da inflação. Se o Saldo VP estiver muito abaixo do aparente, 
                a inflação está "comendo" seus ganhos.
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
                <TableHead className="text-right">Aporte Acum. Aparente</TableHead>
                <TableHead className="text-right">Aporte Acum. VP</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('balance')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Saldo Aparente
                    {renderSortIcon('balance')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Saldo VP</TableHead>
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
