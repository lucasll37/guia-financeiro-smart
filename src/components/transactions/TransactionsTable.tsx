import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useMaskValues } from "@/hooks/useMaskValues";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
};

interface TransactionsTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  categories?: any[]; // Lista completa de categorias para resolver hierarquia
  canEdit?: boolean;
  accountType?: string; // Tipo da conta (e.g., "casa")
}

export function TransactionsTable({
  transactions,
  onEdit,
  onDelete,
  categories = [],
  canEdit = true,
  accountType,
}: TransactionsTableProps) {
  const [sortField, setSortField] = useState<'date' | 'description' | 'amount' | 'category' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const { maskValue } = useMaskValues();

  const handleSort = (field: 'date' | 'description' | 'amount' | 'category') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Para data, começar com asc (mais antigo primeiro), para outros desc
      setSortDirection(field === 'date' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: 'date' | 'description' | 'amount' | 'category') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Separar e ordenar transações por tipo
  const { incomeTransactions, expenseTransactions, totalIncome, totalExpense } = useMemo(() => {
    const income = transactions.filter((t) => t.categories?.type === "receita");
    const expense = transactions.filter((t) => t.categories?.type === "despesa");
    
    const sortTransactions = (txs: Transaction[]) => {
      if (!sortField) return txs;
      
      return [...txs].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'description') {
          comparison = a.description.localeCompare(b.description);
        } else if (sortField === 'amount') {
          comparison = a.amount - b.amount;
        } else if (sortField === 'category') {
          // Buscar categoria pai para agrupar
          const catA = categories.find(c => c.id === a.category_id);
          const catB = categories.find(c => c.id === b.category_id);
          
          const parentA = catA?.parent_id ? categories.find(c => c.id === catA.parent_id) : null;
          const parentB = catB?.parent_id ? categories.find(c => c.id === catB.parent_id) : null;
          
          // Primeiro comparar por categoria pai
          const parentNameA = parentA?.name || catA?.name || '';
          const parentNameB = parentB?.name || catB?.name || '';
          
          comparison = parentNameA.localeCompare(parentNameB);
          
          // Se mesma categoria pai, ordenar por subcategoria
          if (comparison === 0) {
            const subNameA = catA?.name || '';
            const subNameB = catB?.name || '';
            comparison = subNameA.localeCompare(subNameB);
          }
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    };
    
    const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expense.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      incomeTransactions: sortTransactions(income),
      expenseTransactions: sortTransactions(expense),
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
    };
  }, [transactions, sortField, sortDirection]);

  const balance = totalIncome - totalExpense;

  const renderTransactionRow = (transaction: Transaction) => {
    const isExpense = transaction.categories?.type === "despesa";
    const isCreditCard = !!transaction.credit_card_id;
    const isIncome = transaction.categories?.type === "receita";
    
    return (
      <TableRow key={transaction.id}>
        <TableCell>
          {format(parse(String(transaction.date), "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}
        </TableCell>
        <TableCell>
          {transaction.categories && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: transaction.categories.color }}
              />
              <span>{transaction.categories.name}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <span>{transaction.description}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className={isExpense ? "text-destructive" : "text-green-600"}>
            {isExpense ? "-" : "+"} {maskValue(formatCurrency(transaction.amount))}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
              disabled={!canEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
              disabled={!canEdit}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead className="w-[200px]">Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-[150px]">Valor</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum lançamento encontrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Receitas */}
      {incomeTransactions.length > 0 && (
        <Collapsible open={incomeExpanded} onOpenChange={setIncomeExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas</h3>
                {incomeExpanded ? (
                  <ChevronDown className="h-4 w-4 text-green-700 dark:text-green-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-green-700 dark:text-green-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Data
                    {renderSortIcon('date')}
                  </Button>
                </TableHead>
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('description')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Descrição
                    {renderSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeTransactions.map(renderTransactionRow)}
              <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                <TableCell colSpan={3} className="text-right">
                  Total de Receitas:
                </TableCell>
                <TableCell className="text-right text-green-600">
                  + {maskValue(formatCurrency(totalIncome))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Despesas */}
      {expenseTransactions.length > 0 && (
        <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas</h3>
                {expenseExpanded ? (
                  <ChevronDown className="h-4 w-4 text-red-700 dark:text-red-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-red-700 dark:text-red-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Data
                    {renderSortIcon('date')}
                  </Button>
                </TableHead>
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('description')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Descrição
                    {renderSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseTransactions.map(renderTransactionRow)}
              <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                <TableCell colSpan={3} className="text-right">
                  Total de Despesas:
                </TableCell>
                <TableCell className="text-right text-destructive">
                  - {maskValue(formatCurrency(totalExpense))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Saldo */}
      <div className="border rounded-lg bg-muted/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Saldo:</span>
            <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {maskValue(formatCurrency(balance))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
