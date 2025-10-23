import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

const investmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["renda_fixa", "fundo", "acao", "outro"]),
  balance: z.number().min(0, "Saldo deve ser positivo"),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  accountId: string;
  onSubmit: (data: any) => void;
}

const investmentTypes = {
  renda_fixa: "Renda Fixa",
  fundo: "Fundo",
  acao: "Ação",
  outro: "Outro",
};

export function InvestmentDialog({
  open,
  onOpenChange,
  investment,
  accountId,
  onSubmit,
}: InvestmentDialogProps) {
  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: "",
      type: "renda_fixa",
      balance: 0,
    },
  });

  useEffect(() => {
    if (investment) {
      form.reset({
        name: investment.name,
        type: investment.type as any,
        balance: Number(investment.balance),
      });
    } else {
      form.reset({
        name: "",
        type: "renda_fixa",
        balance: 0,
      });
    }
  }, [investment, form]);

  const handleSubmit = (data: InvestmentFormData) => {
    if (investment) {
      onSubmit({ id: investment.id, ...data });
    } else {
      onSubmit({ ...data, account_id: accountId });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {investment ? "Editar Investimento" : "Novo Investimento"}
          </DialogTitle>
          <DialogDescription>
            {investment
              ? "Atualize os dados do investimento"
              : "Adicione um novo investimento à sua carteira"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tesouro Selic 2027" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(investmentTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Atual</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    O rendimento será registrado mensalmente através dos lançamentos
                  </FormDescription>
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
                {investment ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
