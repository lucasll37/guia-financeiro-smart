import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FolderTree, DollarSign, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  category_id: z.string().min(1, "Subcategoria é obrigatória"),
  forecasted_amount: z.string().min(1, "Valor é obrigatório"),
  selected_date: z.date({ required_error: "Mês é obrigatório" }),
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
  accountType?: string;
}

export function ForecastDialog({
  open,
  onOpenChange,
  onSave,
  forecast,
  accountId,
  categories,
  selectedMonth,
  accountType,
}: ForecastDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: "",
      forecasted_amount: "",
      selected_date: selectedMonth ? new Date(selectedMonth + "-01T00:00:00") : new Date(),
      notes: "",
    },
  });

  useEffect(() => {
    if (forecast) {
      form.reset({
        category_id: forecast.category_id,
        forecasted_amount: String(forecast.forecasted_amount),
        selected_date: new Date(forecast.period_start),
        notes: forecast.notes || "",
      });
    } else {
      // Usar o mês de referência selecionado nos filtros
      const referenceDate = selectedMonth ? new Date(selectedMonth + "-01T00:00:00") : new Date();
      form.reset({
        category_id: "",
        forecasted_amount: "",
        selected_date: referenceDate,
        notes: "",
      });
    }
  }, [forecast, form, selectedMonth]);

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
    
    const periodStart = format(startOfMonth(data.selected_date), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(data.selected_date), "yyyy-MM-dd");

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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {forecast ? "Editar Previsão" : "Nova Previsão"}
          </DialogTitle>
          <DialogDescription>
            {forecast ? "Atualize os dados da previsão" : "Cadastre uma nova previsão de receita ou despesa"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="selected_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      Mês de Referência
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMMM 'de' yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione o mês</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                          defaultMonth={field.value || new Date()}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="forecasted_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Valor Previsto
                    </FormLabel>
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
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => {
                // Agrupar subcategorias por categoria pai
                const parentCategories = categories.filter((c) => c.parent_id === null);
                
                // Filtrar receitas se for conta casa
                const filteredParents = accountType === "casa" 
                  ? parentCategories.filter(p => p.type === "despesa")
                  : parentCategories;
                
                const groupedSubcategories = filteredParents.map((parent) => ({
                  parent,
                  subcategories: categories.filter((c) => c.parent_id === parent.id),
                })).filter(group => group.subcategories.length > 0);
                
                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      Subcategoria
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a subcategoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groupedSubcategories.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nenhuma subcategoria disponível. Crie subcategorias primeiro.
                          </div>
                        ) : (
                          groupedSubcategories.map((group) => (
                            <div key={group.parent.id}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: group.parent.color }}
                                />
                                {group.parent.name}
                              </div>
                              {group.subcategories.map((subcategory) => (
                                <SelectItem key={subcategory.id} value={subcategory.id} className="pl-8">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: subcategory.color }}
                                    />
                                    {subcategory.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações sobre esta previsão..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {forecast ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
