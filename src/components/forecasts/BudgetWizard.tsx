import { useState, useMemo, useEffect } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const step1Schema = z.object({
  total_income: z.string().min(1, "Receita total é obrigatória"),
  selected_month: z.date({ required_error: "Mês é obrigatório" }),
});

interface BudgetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (forecasts: any[]) => void;
  accountId: string;
  categories: any[];
  selectedMonth: string;
}

interface CategoryAllocation {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
}

export function BudgetWizard({
  open,
  onOpenChange,
  onSave,
  accountId,
  categories,
  selectedMonth,
}: BudgetWizardProps) {
  const [step, setStep] = useState(1);
  const [totalIncome, setTotalIncome] = useState(0);
  const [allocations, setAllocations] = useState<CategoryAllocation[]>([]);
  const [workingMonth, setWorkingMonth] = useState(new Date(selectedMonth + "-01"));

  const form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      total_income: "",
      selected_month: new Date(selectedMonth + "-01"),
    },
  });

  // Filtrar apenas subcategorias de despesa
  const expenseSubcategories = useMemo(() => {
    return categories.filter((c) => c.parent_id !== null && c.type === "despesa");
  }, [categories]);

  // Inicializar alocações quando as categorias mudarem
  useEffect(() => {
    if (expenseSubcategories.length > 0 && allocations.length === 0) {
      setAllocations(
        expenseSubcategories.map((cat) => ({
          category_id: cat.id,
          name: cat.name,
          color: cat.color,
          amount: 0,
          percentage: 0,
        }))
      );
    }
  }, [expenseSubcategories, allocations.length]);

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, a) => sum + a.amount, 0);
  }, [allocations]);

  const remaining = useMemo(() => {
    return totalIncome - totalAllocated;
  }, [totalIncome, totalAllocated]);

  const allocationPercentage = useMemo(() => {
    return totalIncome > 0 ? (totalAllocated / totalIncome) * 100 : 0;
  }, [totalAllocated, totalIncome]);

  const handleStep1Submit = (data: z.infer<typeof step1Schema>) => {
    const income = parseFloat(data.total_income);
    setTotalIncome(income);
    setWorkingMonth(data.selected_month);
    setStep(2);
  };

  const handleAmountChange = (categoryId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setAllocations((prev) =>
      prev.map((a) =>
        a.category_id === categoryId
          ? {
              ...a,
              amount,
              percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
            }
          : a
      )
    );
  };

  const handlePercentageChange = (categoryId: string, percentage: number) => {
    const amount = (percentage / 100) * totalIncome;
    setAllocations((prev) =>
      prev.map((a) =>
        a.category_id === categoryId
          ? {
              ...a,
              amount,
              percentage,
            }
          : a
      )
    );
  };

  const handleDistributeEvenly = () => {
    const perCategory = totalIncome / allocations.length;
    setAllocations((prev) =>
      prev.map((a) => ({
        ...a,
        amount: perCategory,
        percentage: (perCategory / totalIncome) * 100,
      }))
    );
  };

  const handleFinish = () => {
    const periodStart = format(startOfMonth(workingMonth), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(workingMonth), "yyyy-MM-dd");

    // Criar previsão de receita
    const incomeCategories = categories.filter(
      (c) => c.parent_id !== null && c.type === "receita"
    );
    const incomeCategory = incomeCategories[0]; // Pegar a primeira subcategoria de receita

    const forecasts = [
      // Adicionar receita se houver categoria de receita
      ...(incomeCategory
        ? [
            {
              account_id: accountId,
              category_id: incomeCategory.id,
              period_start: periodStart,
              period_end: periodEnd,
              forecasted_amount: totalIncome,
              notes: "Criado via Assistente de Orçamento",
            },
          ]
        : []),
      // Adicionar todas as despesas com valor > 0
      ...allocations
        .filter((a) => a.amount > 0)
        .map((a) => ({
          account_id: accountId,
          category_id: a.category_id,
          period_start: periodStart,
          period_end: periodEnd,
          forecasted_amount: a.amount,
          notes: "Criado via Assistente de Orçamento",
        })),
    ];

    onSave(forecasts);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setTotalIncome(0);
    setAllocations([]);
    setWorkingMonth(new Date(selectedMonth + "-01"));
    form.reset({
      total_income: "",
      selected_month: new Date(selectedMonth + "-01"),
    });
    onOpenChange(false);
  };

  const canProceedToStep3 = Math.abs(remaining) < 0.01;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Assistente de Lançamento
          </DialogTitle>
          <DialogDescription>
            Crie as previsões do mês de forma simples e visual
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-1 w-16 mx-2 transition-all",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Total Income */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Passo 1: Mês e Receita</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione o mês e informe a receita esperada
                  </p>
                </div>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleStep1Submit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="selected_month"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-2 text-base">
                          <Calendar className="h-4 w-4" />
                          Mês de Referência
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-14 text-lg",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "MMMM 'de' yyyy", { locale: ptBR })
                                ) : (
                                  <span>Selecione o mês</span>
                                )}
                                <Calendar className="ml-auto h-5 w-5 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
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
                    name="total_income"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-base">
                          <DollarSign className="h-4 w-4" />
                          Receita Total Esperada
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
                            className="text-2xl h-14 text-center font-semibold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12" size="lg">
                    Próximo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Step 2: Allocate Expenses */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-semibold">
                    {format(workingMonth, "MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Receita Total</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {totalIncome.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Alocado</span>
                  <span
                    className={cn(
                      "font-semibold",
                      remaining < 0 ? "text-destructive" : "text-foreground"
                    )}
                  >
                    R$ {totalAllocated.toFixed(2)}
                  </span>
                </div>
                <Progress value={allocationPercentage} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {allocationPercentage.toFixed(1)}% alocado
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      remaining < 0
                        ? "text-destructive"
                        : remaining === 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {remaining < 0 ? "Excedeu" : "Restante"}: R${" "}
                    {Math.abs(remaining).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Distribution Controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Distribuir Despesas
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDistributeEvenly}
              >
                Distribuir Igualmente
              </Button>
            </div>

            {/* Categories Allocation */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.category_id}
                    className="p-4 rounded-lg border bg-card space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: allocation.color }}
                        />
                        <span className="font-medium">{allocation.name}</span>
                      </div>
                      <div className="text-right">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={allocation.amount.toFixed(2)}
                          onChange={(e) =>
                            handleAmountChange(
                              allocation.category_id,
                              e.target.value
                            )
                          }
                          className="w-32 text-right font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{allocation.percentage.toFixed(1)}%</span>
                        <span>R$ {allocation.amount.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[allocation.percentage]}
                        onValueChange={([value]) =>
                          handlePercentageChange(allocation.category_id, value)
                        }
                        max={100}
                        step={0.1}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className="flex-1"
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Passo 3: Revisar</h3>
                  <p className="text-sm text-muted-foreground">
                    Confira seu orçamento antes de salvar
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Mês de Referência
                    </p>
                    <p className="font-semibold">
                      {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Receita Total
                    </p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      R$ {totalIncome.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total de Despesas
                    </p>
                    <p className="font-semibold text-destructive">
                      R$ {totalAllocated.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Categorias Alocadas
                    </p>
                    <p className="font-semibold">
                      {allocations.filter((a) => a.amount > 0).length} de{" "}
                      {allocations.length}
                    </p>
                  </div>
                </div>

                {/* Categories List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {allocations
                      .filter((a) => a.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((allocation) => (
                        <div
                          key={allocation.category_id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: allocation.color }}
                            />
                            <span className="font-medium text-sm">
                              {allocation.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              R$ {allocation.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {allocation.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleFinish} className="flex-1" size="lg">
                <Check className="mr-2 h-5 w-5" />
                Criar Previsões
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
