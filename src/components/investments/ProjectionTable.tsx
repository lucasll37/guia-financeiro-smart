import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectionTableProps {
  currentBalance: number;
  initialMonth: Date;
  onConfigChange?: (config: {
    months: number;
    monthlyRate: number;
    inflationRate: number;
    monthlyContribution: number;
  }) => void;
}

export function ProjectionTable({ currentBalance, initialMonth, onConfigChange }: ProjectionTableProps) {
  const [months, setMonths] = useState(12);
  const [monthlyRate, setMonthlyRate] = useState(1);
  const [inflationRate, setInflationRate] = useState(0.5);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [rateStdDev, setRateStdDev] = useState(0);
  const [inflationStdDev, setInflationStdDev] = useState(0);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [sortField, setSortField] = useState<'month' | 'contribution' | 'returns' | 'balance' | 'presentValue' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Box-Muller transform for normal distribution
  const generateNormalRandom = (mean: number, stdDev: number) => {
    if (stdDev === 0) return mean;
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  const projectionData = useMemo(() => {
    const data = [];
    let balance = currentBalance;
    let cumulativeInflation = 0;
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;

    for (let i = 0; i < months; i++) {
      const month = addMonths(initialMonth, i);
      const contribution = monthlyContribution;
      
      // Apply variability using normal distribution
      const actualMonthlyRate = generateNormalRandom(monthlyRate, rateStdDev);
      const actualInflationRate = generateNormalRandom(inflationRate, inflationStdDev);
      
      const returns = (balance + contribution) * (actualMonthlyRate / 100);
      balance = balance + contribution + returns;
      
      // Acumular inflação ao longo dos meses (usando taxa com variabilidade)
      cumulativeInflation = (1 + cumulativeInflation) * (1 + actualInflationRate / 100) - 1;
      const presentValue = balance / (1 + cumulativeInflation);
      
      // Aportes acumulados
      cumulativeContribution += contribution;
      
      // Valor presente do aporte futuro (desconto até o presente usando taxa com variabilidade)
      const monthsFromNow = i + 1;
      const pvFactor = Math.pow(1 + actualInflationRate / 100, -monthsFromNow);
      cumulativeContributionPV += contribution * pvFactor;

      data.push({
        month,
        contribution,
        returns,
        balance,
        presentValue,
        cumulativeContribution,
        cumulativeContributionPV,
        monthIndex: i,
      });
    }

    // Notify parent of config changes
    if (onConfigChange) {
      onConfigChange({
        months,
        monthlyRate,
        inflationRate,
        monthlyContribution,
      });
    }

    return data;
  }, [currentBalance, initialMonth, months, monthlyRate, inflationRate, monthlyContribution, rateStdDev, inflationStdDev, onConfigChange]);

  const handleSort = (field: 'month' | 'contribution' | 'returns' | 'balance' | 'presentValue') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'month' | 'contribution' | 'returns' | 'balance' | 'presentValue') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedProjectionData = useMemo(() => {
    if (!sortField) return projectionData;

    return [...projectionData].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'month') {
        comparison = a.monthIndex - b.monthIndex;
      } else if (sortField === 'contribution') {
        comparison = a.contribution - b.contribution;
      } else if (sortField === 'returns') {
        comparison = a.returns - b.returns;
      } else if (sortField === 'balance') {
        comparison = a.balance - b.balance;
      } else if (sortField === 'presentValue') {
        comparison = a.presentValue - b.presentValue;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [projectionData, sortField, sortDirection]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção de Investimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Info className="h-4 w-4 mr-2" />
              {isExplanationOpen ? "Ocultar" : "Mostrar"} Explicação dos Termos
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 p-4 bg-muted rounded-lg space-y-4 text-sm">
            <div className="pb-3 border-b border-border">
              <h4 className="font-semibold text-base mb-2 text-primary">🔮 Projeção Futura</h4>
              <p className="text-muted-foreground mb-3">
                Simula como seu investimento pode evoluir nos próximos meses, considerando aportes regulares, 
                rentabilidade e inflação esperadas.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1.5">📊 Saldo Aparente (Projetado)</h4>
              <p className="text-muted-foreground mb-2">
                É o valor nominal futuro que você verá no extrato. Representa quanto dinheiro você terá "no papel", 
                mas não considera a perda de poder de compra pela inflação futura.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border mb-1">
                Saldo = Saldo Anterior + Aporte + (Saldo + Aporte) × Taxa Mensal
              </p>
              <p className="text-xs text-muted-foreground italic">
                Fórmula dos Juros Compostos: VF = VP × (1 + i)ⁿ
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">📈 Saldo VP (Valor Presente Projetado)</h4>
              <p className="text-muted-foreground mb-2">
                É quanto esse saldo futuro vale em dinheiro de hoje. Traz o valor futuro para o presente, 
                descontando a inflação esperada. Mostra o ganho real de poder de compra.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border mb-1">
                Saldo VP = Saldo Aparente / (1 + Inflação Acumulada)
              </p>
              <p className="text-xs text-muted-foreground italic">
                Fórmula do Desconto: VP = VF / (1 + i)ⁿ
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">💵 Aporte Acumulado Aparente</h4>
              <p className="text-muted-foreground mb-2">
                É a soma nominal de todos os aportes futuros que você planeja fazer. 
                Não considera que aportes futuros valem menos que dinheiro disponível hoje.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border">
                Aporte Acum. Aparente = Σ Aportes Mensais Planejados
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1.5">💎 Aporte Acumulado VP</h4>
              <p className="text-muted-foreground mb-2">
                É quanto você precisaria ter investido hoje para equivaler aos aportes futuros planejados. 
                Considera o conceito de valor do dinheiro no tempo: R$ 100 hoje valem mais que R$ 100 daqui a 1 ano.
              </p>
              <p className="font-mono text-xs mt-1 bg-background p-2 rounded border mb-1">
                Aporte VP = Aporte Futuro / (1 + Inflação)ⁿ
              </p>
              <p className="text-xs text-muted-foreground italic">
                Onde n = número de meses até o aporte
              </p>
            </div>

            <div className="pt-3 bg-chart-2/10 -m-4 mt-4 p-4 rounded-b-lg">
              <h4 className="font-semibold mb-1.5 flex items-center gap-2">
                <span>💡</span> Interpretando a Projeção
              </h4>
              <ul className="text-muted-foreground text-xs leading-relaxed space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Se <strong>Saldo VP</strong> cresce bem acima de <strong>Aporte Acum. VP</strong>, 
                  seu investimento está gerando bons retornos reais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>A diferença entre <strong>Saldo Aparente</strong> e <strong>Saldo VP</strong> 
                  mostra o impacto da inflação futura</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Aporte Acum. VP</strong> menor que <strong>Aparente</strong> reflete o 
                  valor do dinheiro no tempo (preferência por liquidez)</span>
                </li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="months">Prazo (meses)</Label>
              <Input
                id="months-input"
                type="number"
                min={1}
                max={360}
                value={months}
                onChange={(e) => setMonths(Math.min(360, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 h-8 text-center"
              />
            </div>
            <Slider
              id="months"
              min={1}
              max={360}
              step={1}
              value={[months]}
              onValueChange={(value) => setMonths(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate">Rendimento Mensal (%)</Label>
              <Input
                id="rate-input"
                type="number"
                step="0.01"
                min={-2}
                max={2}
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(Math.min(2, Math.max(-2, Number(e.target.value))))}
                className="w-20 h-8 text-center"
              />
            </div>
            <Slider
              id="rate"
              min={-2}
              max={2}
              step={0.01}
              value={[monthlyRate]}
              onValueChange={(value) => setMonthlyRate(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rateStdDev">Desvio Padrão Rendimento (%)</Label>
              <Input
                id="rateStdDev-input"
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={rateStdDev}
                onChange={(e) => setRateStdDev(Math.min(1, Math.max(0, Number(e.target.value))))}
                className="w-20 h-8 text-center"
              />
            </div>
            <Slider
              id="rateStdDev"
              min={0}
              max={1}
              step={0.01}
              value={[rateStdDev]}
              onValueChange={(value) => setRateStdDev(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="inflation">Inflação Mensal (%)</Label>
              <Input
                id="inflation-input"
                type="number"
                step="0.01"
                min={-2}
                max={2}
                value={inflationRate}
                onChange={(e) => setInflationRate(Math.min(2, Math.max(-2, Number(e.target.value))))}
                className="w-20 h-8 text-center"
              />
            </div>
            <Slider
              id="inflation"
              min={-2}
              max={2}
              step={0.01}
              value={[inflationRate]}
              onValueChange={(value) => setInflationRate(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="inflationStdDev">Desvio Padrão Inflação (%)</Label>
              <Input
                id="inflationStdDev-input"
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={inflationStdDev}
                onChange={(e) => setInflationStdDev(Math.min(1, Math.max(0, Number(e.target.value))))}
                className="w-20 h-8 text-center"
              />
            </div>
            <Slider
              id="inflationStdDev"
              min={0}
              max={1}
              step={0.01}
              value={[inflationStdDev]}
              onValueChange={(value) => setInflationStdDev(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="contribution">Aporte Mensal (R$)</Label>
              <Input
                id="contribution-input"
                type="number"
                step="100"
                min={0}
                max={20000}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Math.min(20000, Math.max(0, Number(e.target.value))))}
                className="w-24 h-8 text-center"
              />
            </div>
            <Slider
              id="contribution"
              min={0}
              max={20000}
              step={100}
              value={[monthlyContribution]}
              onValueChange={(value) => setMonthlyContribution(value[0])}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('month')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Mês
                    {renderSortIcon('month')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('contribution')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Aporte
                    {renderSortIcon('contribution')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Aporte Acum. Aparente</TableHead>
                <TableHead className="text-right">Aporte Acum. VP</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('returns')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Rendimento
                    {renderSortIcon('returns')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('balance')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Saldo Aparente
                    {renderSortIcon('balance')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('presentValue')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Saldo VP
                    {renderSortIcon('presentValue')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjectionData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {format(row.month, "MMM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.contribution)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.cumulativeContribution)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.cumulativeContributionPV)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.returns)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.balance)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.presentValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Inicial</p>
            <p className="text-lg font-semibold">{formatCurrency(currentBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Final Projetado (Aparente)</p>
            <p className="text-lg font-semibold">
              {formatCurrency(projectionData[projectionData.length - 1]?.balance || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Final Projetado (VP)</p>
            <p className="text-lg font-semibold text-chart-2">
              {formatCurrency(projectionData[projectionData.length - 1]?.presentValue || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
