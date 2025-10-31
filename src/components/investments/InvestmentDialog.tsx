import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { DecimalInput } from "@/components/ui/decimal-input";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

const investmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["renda_fixa", "fundo", "acao", "outro"]),
  balance: z.number().min(0, "Saldo deve ser positivo"),
  initial_month: z.string().min(1, "Mês inicial é obrigatório"),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  accountId?: string;
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
      initial_month: new Date().toISOString().slice(0, 7),
    },
  });

  // Get current user
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  useEffect(() => {
    if (investment) {
      form.reset({
        name: investment.name,
        type: investment.type as any,
        balance: Number(investment.balance),
        initial_month: investment.initial_month?.slice(0, 7) || new Date().toISOString().slice(0, 7),
      });
    } else {
      form.reset({
        name: "",
        type: "renda_fixa",
        balance: 0,
        initial_month: new Date().toISOString().slice(0, 7),
      });
    }
  }, [investment, form]);

  const handleSubmit = (data: InvestmentFormData) => {
    if (!session?.user?.id && !investment) {
      alert("Você precisa estar logado para criar um investimento");
      return;
    }

    // Convert YYYY-MM to YYYY-MM-01 for PostgreSQL date format
    const formattedData = {
      ...data,
      initial_month: `${data.initial_month}-01`,
    };
    
    if (investment) {
      onSubmit({ id: investment.id, ...formattedData });
    } else {
      // Add owner_id for new investments and optional account_id
      const newInvestmentData: any = {
        ...formattedData,
        owner_id: session!.user!.id,
      };
      
      // Only include account_id if provided
      if (accountId) {
        newInvestmentData.account_id = accountId;
      }
      
      onSubmit(newInvestmentData);
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
                  <FormLabel>Saldo Inicial</FormLabel>
                  <FormControl>
                    <DecimalInput
                      placeholder="0.00"
                      value={field.value ?? null}
                      onValueChange={(num) => field.onChange(num ?? 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Valor inicial do investimento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initial_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês Inicial</FormLabel>
                  <FormControl>
                    <Input
                      type="month"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Mês de início do investimento. Os rendimentos mensais serão registrados sequencialmente a partir deste mês.
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
