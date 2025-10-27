import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Repeat } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  is_recurring: boolean;
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  selectedIds: string[];
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Agrupar transações por tipo
  const { incomeTransactions, expenseTransactions, totalIncome, totalExpense } = useMemo(() => {
    const income = transactions.filter((t) => t.categories?.type === "receita");
    const expense = transactions.filter((t) => t.categories?.type === "despesa");
    
    const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expense.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      incomeTransactions: income,
      expenseTransactions: expense,
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
    };
  }, [transactions]);

  const balance = totalIncome - totalExpense;

  const renderTransactionRow = (transaction: Transaction) => {
    const isExpense = transaction.categories?.type === "despesa";
    
    return (
      <TableRow key={transaction.id}>
        <TableCell>
          <Checkbox
            checked={selectedIds.includes(transaction.id)}
            onCheckedChange={(checked) =>
              onSelectOne(transaction.id, checked as boolean)
            }
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {format(new Date(transaction.date), "dd/MM/yyyy")}
            {transaction.is_recurring && (
              <Repeat className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </TableCell>
        <TableCell>{transaction.description}</TableCell>
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
        <TableCell className="text-right">
          <span className={isExpense ? "text-destructive" : "text-green-600"}>
            {isExpense ? "-" : "+"} {formatCurrency(transaction.amount)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
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
              <TableHead className="w-12">
                <Checkbox checked={false} onCheckedChange={onSelectAll} />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
        <div className="border rounded-lg">
          <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b">
            <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={incomeTransactions.every((t) => selectedIds.includes(t.id))}
                    onCheckedChange={(checked) => {
                      incomeTransactions.forEach((t) => onSelectOne(t.id, checked as boolean));
                    }}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeTransactions.map(renderTransactionRow)}
              <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  Total de Receitas:
                </TableCell>
                <TableCell className="text-right text-green-600">
                  + {formatCurrency(totalIncome)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Despesas */}
      {expenseTransactions.length > 0 && (
        <div className="border rounded-lg">
          <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b">
            <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={expenseTransactions.every((t) => selectedIds.includes(t.id))}
                    onCheckedChange={(checked) => {
                      expenseTransactions.forEach((t) => onSelectOne(t.id, checked as boolean));
                    }}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseTransactions.map(renderTransactionRow)}
              <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  Total de Despesas:
                </TableCell>
                <TableCell className="text-right text-destructive">
                  - {formatCurrency(totalExpense)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Saldo */}
      <div className="border rounded-lg bg-muted/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Saldo do Período:</span>
            <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
