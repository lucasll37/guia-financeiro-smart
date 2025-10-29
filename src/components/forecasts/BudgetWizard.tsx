import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  Check,
  Wand2,
  Calendar,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BudgetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (forecasts: any[]) => void;
  accountId: string;
  categories: any[];
  selectedMonth: string;
}

interface ForecastEntry {
  subcategory_id: string;
  amount: string;
  notes: string;
  existing_id?: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  color: string;
  type: "receita" | "despesa";
  subcategories: {
    id: string;
    name: string;
    color: string;
  }[];
}

export function BudgetWizard({
  open,
  onOpenChange,
  onSave,
  accountId,
  categories,
  selectedMonth,
}: BudgetWizardProps) {
  const [step, setStep] = useState<"month" | "income" | "expenses">("month");
  const [workingMonth, setWorkingMonth] = useState(new Date(selectedMonth + "-01"));
  const [incomeEntries, setIncomeEntries] = useState<ForecastEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ForecastEntry[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Agrupar categorias por tipo
  const categoryGroups = useMemo(() => {
    const parentCategories = categories.filter((c) => c.parent_id === null);
    const groups: CategoryGroup[] = [];

    parentCategories.forEach((parent) => {
      const subcategories = categories.filter(
        (c) => c.parent_id === parent.id
      );
      if (subcategories.length > 0) {
        groups.push({
          id: parent.id,
          name: parent.name,
          color: parent.color,
          type: parent.type,
          subcategories: subcategories.map((sub) => ({
            id: sub.id,
            name: sub.name,
            color: sub.color,
          })),
        });
      }
    });

    return groups;
  }, [categories]);

  const incomeGroups = useMemo(
    () => categoryGroups.filter((g) => g.type === "receita"),
    [categoryGroups]
  );

  const expenseGroups = useMemo(
    () => categoryGroups.filter((g) => g.type === "despesa"),
    [categoryGroups]
  );

  // Carregar previsões existentes ao selecionar mês
  const loadExistingForecasts = async (month: Date) => {
    setIsLoading(true);
    try {
      const periodStart = format(startOfMonth(month), "yyyy-MM-dd");
      const periodEnd = format(endOfMonth(month), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("account_period_forecasts")
        .select("*")
        .eq("account_id", accountId)
        .gte("period_start", periodStart)
        .lte("period_start", periodEnd);

      if (error) throw error;

      if (data && data.length > 0) {
        // Separar receitas e despesas
        const incomeData: ForecastEntry[] = [];
        const expenseData: ForecastEntry[] = [];

        data.forEach((forecast) => {
          const category = categories.find((c) => c.id === forecast.category_id);
          if (!category) return;

          const entry: ForecastEntry = {
            subcategory_id: forecast.category_id,
            amount: String(forecast.forecasted_amount),
            notes: forecast.notes || "",
            existing_id: forecast.id,
          };

          if (category.type === "receita") {
            incomeData.push(entry);
          } else {
            expenseData.push(entry);
          }
        });

        setIncomeEntries(incomeData);
        setExpenseEntries(expenseData);
      } else {
        // Inicializar vazios
        setIncomeEntries([]);
        setExpenseEntries([]);
      }
    } catch (error) {
      console.error("Erro ao carregar previsões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as previsões existentes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthSelect = async (month: Date) => {
    setWorkingMonth(month);
    await loadExistingForecasts(month);
    setStep("income");
  };

  const getEntryValue = (subcategoryId: string, entries: ForecastEntry[]) => {
    const entry = entries.find((e) => e.subcategory_id === subcategoryId);
    return entry || { subcategory_id: subcategoryId, amount: "", notes: "", existing_id: undefined };
  };

  const updateEntry = (
    subcategoryId: string,
    field: "amount" | "notes",
    value: string,
    isIncome: boolean
  ) => {
    const setter = isIncome ? setIncomeEntries : setExpenseEntries;
    setter((prev) => {
      const existing = prev.find((e) => e.subcategory_id === subcategoryId);
      if (existing) {
        return prev.map((e) =>
          e.subcategory_id === subcategoryId ? { ...e, [field]: value } : e
        );
      } else {
        return [...prev, { subcategory_id: subcategoryId, amount: field === "amount" ? value : "", notes: field === "notes" ? value : "", existing_id: undefined }];
      }
    });
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFinish = async () => {
    const periodStart = format(startOfMonth(workingMonth), "yyyy-MM-dd");
    const periodEnd = format(endOfMonth(workingMonth), "yyyy-MM-dd");

    const allEntries = [...incomeEntries, ...expenseEntries].filter(
      (e) => e.amount && parseFloat(e.amount) > 0
    );

    const forecasts = allEntries.map((entry) => ({
      id: entry.existing_id,
      account_id: accountId,
      category_id: entry.subcategory_id,
      period_start: periodStart,
      period_end: periodEnd,
      forecasted_amount: parseFloat(entry.amount),
      notes: entry.notes || null,
    }));

    onSave(forecasts);
    handleClose();
  };

  const handleClose = () => {
    setStep("month");
    setWorkingMonth(new Date(selectedMonth + "-01"));
    setIncomeEntries([]);
    setExpenseEntries([]);
    setOpenCategories([]);
    onOpenChange(false);
  };

  const totalIncome = useMemo(() => {
    return incomeEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [incomeEntries]);

  const totalExpenses = useMemo(() => {
    return expenseEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [expenseEntries]);

  const balance = totalIncome - totalExpenses;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Assistente de Lançamento
          </DialogTitle>
          <DialogDescription>
            {step === "month" && "Selecione o mês de referência"}
            {step === "income" && "Defina suas receitas previstas"}
            {step === "expenses" && "Distribua suas despesas por categoria"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando previsões...</p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Step: Month Selection */}
            {step === "month" && (
              <div className="space-y-6 py-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Mês de Referência</h3>
                      <p className="text-sm text-muted-foreground">
                        Escolha o mês para criar ou editar previsões
                      </p>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-14 text-lg"
                        )}
                      >
                        {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                        <Calendar className="ml-auto h-5 w-5 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={workingMonth}
                        onSelect={(date) => date && handleMonthSelect(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Step: Income */}
            {step === "income" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 rounded-lg border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-semibold">
                        {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Receitas</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        R$ {totalIncome.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {incomeGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div
                          className="bg-muted/50 p-3 flex items-center gap-2"
                          style={{
                            borderLeft: `4px solid ${group.color}`,
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-semibold">{group.name}</span>
                        </div>
                        <div className="p-4 space-y-3">
                          {group.subcategories.map((sub) => {
                            const entry = getEntryValue(sub.id, incomeEntries);
                            return (
                              <div
                                key={sub.id}
                                className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border bg-card"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: sub.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {sub.name}
                                  </span>
                                </div>
                                <Input
                                  type="text"
                                  placeholder="Descrição..."
                                  value={entry.notes}
                                  onChange={(e) =>
                                    updateEntry(sub.id, "notes", e.target.value, true)
                                  }
                                />
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="R$ 0.00"
                                  value={entry.amount}
                                  onChange={(e) =>
                                    updateEntry(
                                      sub.id,
                                      "amount",
                                      e.target.value.replace(/[^\d.-]/g, ""),
                                      true
                                    )
                                  }
                                  className="text-right font-semibold"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep("month")}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep("expenses")}
                    className="flex-1"
                  >
                    Próximo: Despesas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Expenses */}
            {step === "expenses" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Receitas</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        R$ {totalIncome.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Despesas</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        R$ {totalExpenses.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          balance >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        R$ {balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {expenseGroups.map((group) => {
                      const isOpen = openCategories.includes(group.id);
                      return (
                        <Collapsible
                          key={group.id}
                          open={isOpen}
                          onOpenChange={() => toggleCategory(group.id)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full">
                              <div
                                className="bg-muted/50 p-3 flex items-center gap-2 hover:bg-muted transition-colors"
                                style={{
                                  borderLeft: `4px solid ${group.color}`,
                                }}
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                <span className="font-semibold">{group.name}</span>
                                <span className="ml-auto text-sm text-muted-foreground">
                                  {group.subcategories.length} subcategorias
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="p-4 space-y-3">
                                {group.subcategories.map((sub) => {
                                  const entry = getEntryValue(sub.id, expenseEntries);
                                  return (
                                    <div
                                      key={sub.id}
                                      className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border bg-card"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: sub.color }}
                                        />
                                        <span className="text-sm font-medium">
                                          {sub.name}
                                        </span>
                                      </div>
                                      <Input
                                        type="text"
                                        placeholder="Descrição..."
                                        value={entry.notes}
                                        onChange={(e) =>
                                          updateEntry(sub.id, "notes", e.target.value, false)
                                        }
                                      />
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="R$ 0.00"
                                        value={entry.amount}
                                        onChange={(e) =>
                                          updateEntry(
                                            sub.id,
                                            "amount",
                                            e.target.value.replace(/[^\d.-]/g, ""),
                                            false
                                          )
                                        }
                                        className="text-right font-semibold"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep("income")}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button onClick={handleFinish} className="flex-1">
                    <Check className="mr-2 h-5 w-5" />
                    Salvar Previsões
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
