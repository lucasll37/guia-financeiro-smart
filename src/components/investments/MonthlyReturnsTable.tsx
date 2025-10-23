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
import { Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
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
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês/Ano</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Saldo Final</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum rendimento registrado
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnData) => (
                  <TableRow key={returnData.id}>
                    <TableCell className="font-medium">
                      {format(new Date(returnData.month), "MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          Number(returnData.actual_return) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatPercentage(Number(returnData.actual_return))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(returnData.balance_after))}
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
