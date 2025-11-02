import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Slider } from "@/components/ui/slider";
import { Info, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useInvestmentSimulationSettings } from "@/hooks/useInvestmentSimulationSettings";
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
import * as XLSX from "xlsx";

interface ProjectionTableProps {
  currentBalance: number;
  initialMonth: Date;
  onConfigChange?: (config: {
    months: number;
    monthlyRate: number;
    inflationRate: number;
    monthlyContribution: number;
  }) => void;
  onProjectionDataChange?: (data: any[]) => void;
}

export function ProjectionTable({ currentBalance, initialMonth, onConfigChange, onProjectionDataChange }: ProjectionTableProps) {
  const { maskValue } = useMaskValues();
  const { settings, isLoading: settingsLoading } = useInvestmentSimulationSettings();
  
  // Load initial values from localStorage or settings
  const [months, setMonths] = useState(() => {
    const saved = localStorage.getItem('projectionTable.months');
    return saved ? Number(saved) : (settings?.months_config?.default ?? 12);
  });
  
  const [monthlyRate, setMonthlyRate] = useState(() => {
    const saved = localStorage.getItem('projectionTable.monthlyRate');
    return saved ? Number(saved) : (settings?.monthly_rate_config?.default ?? 0.83);
  });
  
  const [inflationRate, setInflationRate] = useState(() => {
    const saved = localStorage.getItem('projectionTable.inflationRate');
    return saved ? Number(saved) : (settings?.inflation_rate_config?.default ?? 0.35);
  });
  
  const [monthlyContribution, setMonthlyContribution] = useState(() => {
    const saved = localStorage.getItem('projectionTable.monthlyContribution');
    return saved ? Number(saved) : (settings?.contribution_config?.default ?? 0);
  });
  
  const [rateStdDev, setRateStdDev] = useState(() => {
    const saved = localStorage.getItem('projectionTable.rateStdDev');
    return saved ? Number(saved) : (settings?.rate_std_dev_config?.default ?? 0.15);
  });
  
  const [inflationStdDev, setInflationStdDev] = useState(() => {
    const saved = localStorage.getItem('projectionTable.inflationStdDev');
    return saved ? Number(saved) : (settings?.inflation_std_dev_config?.default ?? 0.25);
  });
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [sortField, setSortField] = useState<'month' | 'contribution' | 'returns' | 'balance' | 'presentValue' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [seed, setSeed] = useState<number>(() => Date.now());

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('projectionTable.months', String(months));
  }, [months]);

  useEffect(() => {
    localStorage.setItem('projectionTable.monthlyRate', String(monthlyRate));
  }, [monthlyRate]);

  useEffect(() => {
    localStorage.setItem('projectionTable.inflationRate', String(inflationRate));
  }, [inflationRate]);

  useEffect(() => {
    localStorage.setItem('projectionTable.monthlyContribution', String(monthlyContribution));
  }, [monthlyContribution]);

  useEffect(() => {
    localStorage.setItem('projectionTable.rateStdDev', String(rateStdDev));
  }, [rateStdDev]);

  useEffect(() => {
    localStorage.setItem('projectionTable.inflationStdDev', String(inflationStdDev));
  }, [inflationStdDev]);

  // Seeded PRNG to keep randomness stable until user clicks "Gerar Simulação"
  const createPRNG = (seed: number) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Box-Muller transform for normal distribution using seeded RNG
  const generateNormalRandom = (mean: number, stdDev: number, rng: () => number) => {
    if (stdDev === 0) return mean;
    const u1 = Math.max(rng(), Number.EPSILON);
    const u2 = rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  };
  const initialMonthKey = initialMonth.getFullYear() * 12 + initialMonth.getMonth();
  const projectionData = useMemo(() => {
    const rng = createPRNG(seed);
    const data: any[] = [];
    let balance = currentBalance;
    let cumulativeInflation = 0;
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;

    for (let i = 0; i < months; i++) {
      const month = addMonths(initialMonth, i);
      const contribution = monthlyContribution;
      
      // Apply variability using normal distribution
      const actualMonthlyRate = generateNormalRandom(monthlyRate, rateStdDev, rng);
      const actualInflationRate = generateNormalRandom(inflationRate, inflationStdDev, rng);
      
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
        monthlyRatePercent: actualMonthlyRate,
        inflationRatePercent: actualInflationRate,
      });
    }

    return data;
  }, [currentBalance, initialMonthKey, months, monthlyRate, inflationRate, monthlyContribution, rateStdDev, inflationStdDev, seed]);

  // Notify parent components when config or data changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        months,
        monthlyRate,
        inflationRate,
        monthlyContribution,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, monthlyRate, inflationRate, monthlyContribution]);

  useEffect(() => {
    if (onProjectionDataChange && projectionData.length > 0) {
      onProjectionDataChange(projectionData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionData]);

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

  const resetToDefaults = () => {
    setMonthlyRate(settings?.monthly_rate_config?.default ?? 0.83);
    setInflationRate(settings?.inflation_rate_config?.default ?? 0.35);
    setRateStdDev(settings?.rate_std_dev_config?.default ?? 0.15);
    setInflationStdDev(settings?.inflation_std_dev_config?.default ?? 0.25);
  };

  const exportToExcel = () => {
    const dataToExport = sortedProjectionData.map((row) => ({
      "Mês": format(row.month, "MMM/yyyy", { locale: ptBR }),
      "Aporte": row.contribution,
      "Aporte Acumulado Aparente": row.cumulativeContribution,
      "Aporte Acumulado VP": row.cumulativeContributionPV,
      "Rendimento": row.returns,
      "Rendimento Mensal (%)": row.monthlyRatePercent,
      "Inflação Mensal (%)": row.inflationRatePercent,
      "Saldo Aparente": row.balance,
      "Saldo VP": row.presentValue,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projeção");
    
    XLSX.writeFile(wb, `projecao-investimento-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Projeção de Investimento</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setSeed(prev => prev + 1)} variant="default" size="sm">
              Gerar Simulação
            </Button>
            <Button onClick={resetToDefaults} variant="outline" size="sm">
              Resetar taxas
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>
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

        <div className="space-y-4">
          {/* Prazo e Aporte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-md border">
              <h3 className="text-xs font-semibold mb-2 text-primary">Prazo da Simulação</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="months" className="text-xs">Número de meses</Label>
                  <Input
                    id="months-input"
                    type="number"
                    min={settings?.months_config?.min ?? 1}
                    max={settings?.months_config?.max ?? 360}
                    value={months}
                    onChange={(e) => setMonths(Math.min(
                      settings?.months_config?.max ?? 360, 
                      Math.max(settings?.months_config?.min ?? 1, parseInt(e.target.value) || 1)
                    ))}
                    className="w-20 h-8 text-sm text-center"
                  />
                </div>
                <Slider
                  id="months"
                  min={settings?.months_config?.min ?? 1}
                  max={settings?.months_config?.max ?? 360}
                  step={1}
                  value={[months]}
                  onValueChange={(value) => setMonths(value[0])}
                  className="py-1"
                />
              </div>
            </div>

            <div className="p-3 bg-muted/20 rounded-md border">
              <h3 className="text-xs font-semibold mb-2 text-primary">Aporte Mensal</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="contribution" className="text-xs">Valor do aporte</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <DecimalInput
                      id="contribution-input"
                      placeholder="0,00"
                      value={monthlyContribution}
                      onValueChange={(num) => setMonthlyContribution(Math.min(
                        settings?.contribution_config?.max_input ?? 100000, 
                        Math.max(settings?.contribution_config?.min ?? 0, num ?? 0)
                      ))}
                      allowNegative={false}
                      className="w-28 h-7 text-xs text-right"
                    />
                  </div>
                </div>
                <Slider
                  id="contribution"
                  min={settings?.contribution_config?.min ?? 0}
                  max={settings?.contribution_config?.max_slider ?? 20000}
                  step={100}
                  value={[monthlyContribution]}
                  onValueChange={(value) => setMonthlyContribution(value[0])}
                  className="py-1"
                />
              </div>
            </div>
          </div>

          {/* Rentabilidade */}
          <div className="p-3 bg-muted/20 rounded-md border">
            <h3 className="text-xs font-semibold mb-2 text-primary">Rentabilidade Esperada</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rate" className="text-xs">Retorno (%)</Label>
                  <DecimalInput
                    id="rate-input"
                    placeholder="0,00"
                    value={monthlyRate}
                    onValueChange={(num) => setMonthlyRate(Math.min(
                      settings?.monthly_rate_config?.max ?? 5, 
                      Math.max(settings?.monthly_rate_config?.min ?? -2, num ?? 0)
                    ))}
                    allowNegative={true}
                    className="w-14 h-7 text-xs text-center"
                  />
                </div>
                <Slider
                  id="rate"
                  min={settings?.monthly_rate_config?.min ?? -2}
                  max={settings?.monthly_rate_config?.max ?? 5}
                  step={0.01}
                  value={[monthlyRate]}
                  onValueChange={(value) => setMonthlyRate(value[0])}
                  className="py-1"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rateStdDev" className="text-xs">Variação</Label>
                  <DecimalInput
                    id="rateStdDev-input"
                    placeholder="0,00"
                    value={rateStdDev}
                    onValueChange={(num) => setRateStdDev(Math.min(
                      settings?.rate_std_dev_config?.max ?? 5, 
                      Math.max(settings?.rate_std_dev_config?.min ?? 0, num ?? 0)
                    ))}
                    allowNegative={false}
                    className="w-14 h-7 text-xs text-center"
                  />
                </div>
                <Slider
                  id="rateStdDev"
                  min={settings?.rate_std_dev_config?.min ?? 0}
                  max={settings?.rate_std_dev_config?.max ?? 5}
                  step={0.01}
                  value={[rateStdDev]}
                  onValueChange={(value) => setRateStdDev(value[0])}
                  className="py-1"
                />
              </div>
            </div>
          </div>

          {/* Inflação */}
          <div className="p-3 bg-muted/20 rounded-md border">
            <h3 className="text-xs font-semibold mb-2 text-primary">Inflação Projetada</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inflation" className="text-xs">Taxa (%)</Label>
                  <DecimalInput
                    id="inflation-input"
                    placeholder="0,00"
                    value={inflationRate}
                    onValueChange={(num) => setInflationRate(Math.min(
                      settings?.inflation_rate_config?.max ?? 10, 
                      Math.max(settings?.inflation_rate_config?.min ?? -2, num ?? 0)
                    ))}
                    allowNegative={true}
                    className="w-14 h-7 text-xs text-center"
                  />
                </div>
                <Slider
                  id="inflation"
                  min={settings?.inflation_rate_config?.min ?? -2}
                  max={settings?.inflation_rate_config?.max ?? 10}
                  step={0.01}
                  value={[inflationRate]}
                  onValueChange={(value) => setInflationRate(value[0])}
                  className="py-1"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inflationStdDev" className="text-xs">Variação</Label>
                  <DecimalInput
                    id="inflationStdDev-input"
                    placeholder="0,00"
                    value={inflationStdDev}
                    onValueChange={(num) => setInflationStdDev(Math.min(
                      settings?.inflation_std_dev_config?.max ?? 5, 
                      Math.max(settings?.inflation_std_dev_config?.min ?? 0, num ?? 0)
                    ))}
                    allowNegative={false}
                    className="w-14 h-7 text-xs text-center"
                  />
                </div>
                <Slider
                  id="inflationStdDev"
                  min={settings?.inflation_std_dev_config?.min ?? 0}
                  max={settings?.inflation_std_dev_config?.max ?? 5}
                  step={0.01}
                  value={[inflationStdDev]}
                  onValueChange={(value) => setInflationStdDev(value[0])}
                  className="py-1"
                />
              </div>
            </div>
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
                <TableHead className="text-right">Rend. Mensal (%)</TableHead>
                <TableHead className="text-right">Inflação Mensal (%)</TableHead>
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
                    {maskValue(formatCurrency(row.contribution))}
                  </TableCell>
                  <TableCell className="text-right">
                    {maskValue(formatCurrency(row.cumulativeContribution))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {maskValue(formatCurrency(row.cumulativeContributionPV))}
                  </TableCell>
                  <TableCell className="text-right">
                    {maskValue(formatCurrency(row.returns))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.monthlyRatePercent.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.inflationRatePercent.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {maskValue(formatCurrency(row.balance))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {maskValue(formatCurrency(row.presentValue))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Inicial</p>
            <p className="text-lg font-semibold">{maskValue(formatCurrency(currentBalance))}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aporte Acum. Aparente</p>
            <p className="text-lg font-semibold">
              {maskValue(formatCurrency(projectionData[projectionData.length - 1]?.cumulativeContribution || 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aporte Acum. VP</p>
            <p className="text-lg font-semibold text-muted-foreground">
              {maskValue(formatCurrency(projectionData[projectionData.length - 1]?.cumulativeContributionPV || 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Final Projetado (Aparente)</p>
            <p className="text-lg font-semibold">
              {maskValue(formatCurrency(projectionData[projectionData.length - 1]?.balance || 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo Final Projetado (VP)</p>
            <p className="text-lg font-semibold text-chart-2">
              {maskValue(formatCurrency(projectionData[projectionData.length - 1]?.presentValue || 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
