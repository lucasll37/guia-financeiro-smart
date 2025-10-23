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
import { useInvestmentCurrentValue } from "@/hooks/useInvestmentCurrentValue";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

interface InvestmentTableProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onSelectForReturns?: (investment: Investment) => void;
  selectedInvestmentId?: string;
}

const investmentTypes = {
  renda_fixa: "Renda Fixa",
  fundo: "Fundo",
  acao: "Ação",
  outro: "Outro",
};

function InvestmentRow({
  investment,
  onEdit,
  onDelete,
  onSelectForReturns,
  isSelected,
}: {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onSelectForReturns?: (investment: Investment) => void;
  isSelected: boolean;
}) {
  const { data: currentValue, isLoading } = useInvestmentCurrentValue(investment.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <TableRow
      className={`${onSelectForReturns ? "cursor-pointer hover:bg-muted/50" : ""} ${isSelected ? "bg-accent" : ""}`}
      onClick={() => onSelectForReturns?.(investment)}
    >
      <TableCell className="font-medium">{investment.name}</TableCell>
      <TableCell>
        {investmentTypes[investment.type as keyof typeof investmentTypes]}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(Number(investment.balance))}
      </TableCell>
      <TableCell className="text-right font-medium">
        {isLoading ? "..." : formatCurrency(currentValue || 0)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(investment);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(investment.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function InvestmentTable({
  investments,
  onEdit,
  onDelete,
  onSelectForReturns,
  selectedInvestmentId,
}: InvestmentTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo Inicial</TableHead>
            <TableHead className="text-right">Valor Atual</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum investimento encontrado
              </TableCell>
            </TableRow>
          ) : (
            investments.map((investment) => (
              <InvestmentRow
                key={investment.id}
                investment={investment}
                onEdit={onEdit}
                onDelete={onDelete}
                onSelectForReturns={onSelectForReturns}
                isSelected={selectedInvestmentId === investment.id}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
