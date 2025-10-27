import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [sortField, setSortField] = useState<'name' | 'type' | 'balance' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'type' | 'balance') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'type' | 'balance') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedInvestments = useMemo(() => {
    if (!sortField) return investments;
    
    return [...investments].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === 'balance') {
        comparison = Number(a.balance) - Number(b.balance);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [investments, sortField, sortDirection]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="flex items-center gap-1 p-0 h-auto font-medium">
                Nome
                {renderSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="flex items-center gap-1 p-0 h-auto font-medium">
                Tipo
                {renderSortIcon('type')}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" onClick={() => handleSort('balance')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                Saldo Inicial
                {renderSortIcon('balance')}
              </Button>
            </TableHead>
            <TableHead className="text-right">Valor Atual</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvestments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum investimento encontrado
              </TableCell>
            </TableRow>
          ) : (
            sortedInvestments.map((investment) => (
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
