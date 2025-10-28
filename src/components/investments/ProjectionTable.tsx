import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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

  const projectionData = useMemo(() => {
    const data = [];
    let balance = currentBalance;
    let cumulativeInflation = 0;
    let cumulativeContribution = 0;
    let cumulativeContributionPV = 0;

    for (let i = 0; i < months; i++) {
      const month = addMonths(initialMonth, i);
      const contribution = monthlyContribution;
      const returns = (balance + contribution) * (monthlyRate / 100);
      balance = balance + contribution + returns;
      
      // Acumular inflação ao longo dos meses
      cumulativeInflation = (1 + cumulativeInflation) * (1 + inflationRate / 100) - 1;
      const presentValue = balance / (1 + cumulativeInflation);
      
      // Aportes acumulados
      cumulativeContribution += contribution;
      
      // Valor presente do aporte futuro (desconto até o presente)
      const monthsFromNow = i + 1;
      const pvFactor = Math.pow(1 + inflationRate / 100, -monthsFromNow);
      cumulativeContributionPV += contribution * pvFactor;

      data.push({
        month,
        contribution,
        returns,
        balance,
        presentValue,
        cumulativeContribution,
        cumulativeContributionPV,
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
  }, [currentBalance, initialMonth, months, monthlyRate, inflationRate, monthlyContribution, onConfigChange]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Label htmlFor="rate">Rendimento Mensal (%)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inflation">Inflação Mensal (%)</Label>
            <Input
              id="inflation"
              type="number"
              step="0.01"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribution">Aporte Mensal (R$)</Label>
            <Input
              id="contribution"
              type="number"
              step="100"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Aporte</TableHead>
                <TableHead className="text-right">Aporte Acum. Aparente</TableHead>
                <TableHead className="text-right">Aporte Acum. Real</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Saldo Aparente</TableHead>
                <TableHead className="text-right">Saldo Valor Presente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectionData.map((row, index) => (
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
            <p className="text-sm text-muted-foreground">Saldo Final Projetado</p>
            <p className="text-lg font-semibold">
              {formatCurrency(projectionData[projectionData.length - 1]?.balance || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
