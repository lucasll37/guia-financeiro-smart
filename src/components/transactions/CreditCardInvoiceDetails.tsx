import { useMemo } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
};

interface CreditCardInvoiceDetailsProps {
  transactions: Transaction[];
}

export function CreditCardInvoiceDetails({ transactions }: CreditCardInvoiceDetailsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const total = useMemo(() => {
    return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 p-4 space-y-3">
      <h4 className="font-semibold text-sm">Detalhes da Fatura</h4>
      <Table>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-sm">
                {format(new Date(transaction.date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="text-sm">
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
              <TableCell className="text-sm">{transaction.description}</TableCell>
              <TableCell className="text-right text-sm text-destructive">
                - {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold">
            <TableCell colSpan={3} className="text-right">
              Total da Fatura:
            </TableCell>
            <TableCell className="text-right text-destructive">
              - {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
