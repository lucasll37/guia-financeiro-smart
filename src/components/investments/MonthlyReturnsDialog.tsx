import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

const returnSchema = z.object({
  actual_return: z.number(),
  inflation_rate: z.number(),
  contribution: z.number().min(0, "Aporte deve ser positivo"),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

interface MonthlyReturnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyReturn: MonthlyReturn | null;
  investmentId: string;
  onSubmit: (data: any) => void;
}

export function MonthlyReturnsDialog({
  open,
  onOpenChange,
  monthlyReturn,
  investmentId,
  onSubmit,
}: MonthlyReturnsDialogProps) {
  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      actual_return: 0,
      inflation_rate: 0,
      contribution: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (monthlyReturn) {
      form.reset({
        actual_return: Number(monthlyReturn.actual_return),
        inflation_rate: Number(monthlyReturn.inflation_rate),
        contribution: Number(monthlyReturn.contribution),
        notes: monthlyReturn.notes || "",
      });
    } else {
      form.reset({
        actual_return: 0,
        inflation_rate: 0,
        contribution: 0,
        notes: "",
      });
    }
  }, [monthlyReturn, form, open]);

  const handleSubmit = (data: ReturnFormData) => {
    if (monthlyReturn) {
      onSubmit({
        id: monthlyReturn.id,
        actual_return: data.actual_return,
        inflation_rate: data.inflation_rate,
        contribution: data.contribution,
        notes: data.notes || null,
      });
    } else {
      onSubmit({
        investment_id: investmentId,
        actual_return: data.actual_return,
        inflation_rate: data.inflation_rate,
        contribution: data.contribution,
        notes: data.notes || null,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {monthlyReturn ? "Editar Rendimento" : "Registrar Rendimento Mensal"}
          </DialogTitle>
          <DialogDescription>
            {monthlyReturn
              ? "Atualize o rendimento mensal"
              : "Adicione o rendimento real obtido no mês"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {monthlyReturn && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  {(() => { const [y, m] = String(monthlyReturn.month).split('-'); const d = new Date(Number(y), Number(m)-1, 1); return `Mês de referência: ${d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`; })()}
                </p>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="actual_return"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rendimento (%)</FormLabel>
                  <FormControl>
                    <DecimalInput
                      placeholder="0.00"
                      value={field.value ?? null}
                      onValueChange={(num) => field.onChange(num ?? 0)}
                    />
                  </FormControl>
                  <FormDescription>Percentual de rendimento no período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inflation_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inflação Mensal (%)</FormLabel>
                  <FormControl>
                    <DecimalInput
                      placeholder="0.00"
                      value={field.value ?? null}
                      onValueChange={(num) => field.onChange(num ?? 0)}
                    />
                  </FormControl>
                  <FormDescription>Taxa de inflação do período</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contribution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aporte</FormLabel>
                  <FormControl>
                    <DecimalInput
                      placeholder="0.00"
                      value={field.value ?? null}
                      onValueChange={(num) => field.onChange(num ?? 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Valor aportado (ou retirado se negativo) no fim do mês
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre o rendimento..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {monthlyReturn ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
