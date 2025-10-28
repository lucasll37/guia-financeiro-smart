import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";

const formSchema = z.object({
  category_id: z.string().min(1, "Subcategoria é obrigatória"),
  forecasted_amount: z.string().min(1, "Valor é obrigatório"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ForecastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  forecast: any;
  accountId: string;
  categories: any[];
  selectedMonth: string;
}

export function ForecastDialog({
  open,
  onOpenChange,
  onSave,
  forecast,
  accountId,
  categories,
  selectedMonth,
}: ForecastDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: "",
      forecasted_amount: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (forecast) {
      form.reset({
        category_id: forecast.category_id,
        forecasted_amount: String(forecast.forecasted_amount),
        notes: forecast.notes || "",
      });
    } else {
      form.reset({
        category_id: "",
        forecasted_amount: "",
        notes: "",
      });
    }
  }, [forecast, form]);

  const handleSubmit = (data: FormData) => {
    // Validar se é subcategoria
    const selectedCategory = categories.find((c) => c.id === data.category_id);
    if (selectedCategory && !selectedCategory.parent_id) {
      form.setError("category_id", {
        type: "manual",
        message: "Selecione uma subcategoria, não uma categoria principal"
      });
      return;
    }
    
    const monthDate = new Date(selectedMonth + "-01");
    const periodStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

    onSave({
      account_id: accountId,
      category_id: data.category_id,
      period_start: periodStart,
      period_end: periodEnd,
      forecasted_amount: parseFloat(data.forecasted_amount),
      notes: data.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {forecast ? "Editar Previsão" : "Nova Previsão"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => {
                // Filtrar apenas subcategorias
                const subcategories = categories.filter((c) => c.parent_id !== null);
                
                return (
                  <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a subcategoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nenhuma subcategoria disponível. Crie subcategorias primeiro.
                          </div>
                        ) : (
                          subcategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="forecasted_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Previsto</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.-]/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações sobre esta previsão..."
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
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
