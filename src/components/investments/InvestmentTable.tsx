import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

interface InvestmentTableProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
}

const investmentTypes = {
  renda_fixa: "Renda Fixa",
  fundo: "Fundo",
  acao: "Ação",
  outro: "Outro",
};

export function InvestmentTable({
  investments,
  onEdit,
  onDelete,
}: InvestmentTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const calculateNetRate = (monthlyRate: number, fees: number) => {
    return monthlyRate - fees;
  };

  const calculateAPY = (monthlyRate: number, fees: number) => {
    const netRate = calculateNetRate(monthlyRate, fees);
    return Math.pow(1 + netRate, 12) - 1;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Taxa Mensal</TableHead>
            <TableHead className="text-right">Fees</TableHead>
            <TableHead className="text-right">APY</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum investimento encontrado
              </TableCell>
            </TableRow>
          ) : (
            investments.map((investment) => (
              <TableRow key={investment.id}>
                <TableCell className="font-medium">{investment.name}</TableCell>
                <TableCell>
                  {investmentTypes[investment.type as keyof typeof investmentTypes]}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(investment.balance))}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(Number(investment.monthly_rate))}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercentage(Number(investment.fees))}
                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatPercentage(
                    calculateAPY(
                      Number(investment.monthly_rate),
                      Number(investment.fees)
                    )
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(investment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(investment.id)}
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
  );
}
