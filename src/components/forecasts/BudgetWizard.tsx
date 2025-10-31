import { useState, useMemo, useEffect } from "react";
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
  accountType?: string;
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

const parseSelectedMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
};

export function BudgetWizard({
  open,
  onOpenChange,
  onSave,
  accountId,
  categories,
  selectedMonth,
  accountType,
}: BudgetWizardProps) {
  const [step, setStep] = useState<"month" | "income" | "expenses">("month");
  const [workingMonth, setWorkingMonth] = useState(parseSelectedMonth(selectedMonth));
  const [incomeEntries, setIncomeEntries] = useState<ForecastEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ForecastEntry[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Atualizar o mês de trabalho quando o dialog abre ou selectedMonth muda
  useEffect(() => {
    if (open) {
      setWorkingMonth(parseSelectedMonth(selectedMonth));
    }
  }, [open, selectedMonth]);

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

  const handleMonthSelect = (month: Date) => {
    setWorkingMonth(month);
  };

  const handleContinueFromMonth = async () => {
    await loadExistingForecasts(workingMonth);
    // Pular etapa de receitas em contas casa
    setStep(accountType === "casa" ? "expenses" : "income");
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
    setWorkingMonth(parseSelectedMonth(selectedMonth));
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
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Assistente de Lançamento
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "month" && "Selecione o mês de referência"}
            {step === "income" && "Defina suas receitas previstas"}
            {step === "expenses" && (accountType === "casa" ? "Distribua suas despesas por categoria" : "Distribua suas despesas por categoria")}
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
              <div className="space-y-4 py-2">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Mês de Referência</h3>
                      <p className="text-xs text-muted-foreground">
                        Escolha o mês para criar ou editar previsões
                      </p>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 text-sm"
                        )}
                      >
                        {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
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

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    onClick={handleContinueFromMonth}
                    className="gap-2"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Income */}
            {step === "income" && (
              <div className="space-y-2">
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-3 rounded-lg border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-sm">
                        {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Receitas</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        R$ {totalIncome.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[420px] pr-4">
                  <div className="space-y-2">
                    {incomeGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div
                          className="bg-muted/50 p-2 flex items-center gap-2"
                          style={{
                            borderLeft: `4px solid ${group.color}`,
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-semibold text-sm">{group.name}</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {group.subcategories.map((sub) => {
                            const entry = getEntryValue(sub.id, incomeEntries);
                            return (
                              <div
                                key={sub.id}
                                className="grid gap-2 p-2 rounded-lg border bg-card"
                                style={{ gridTemplateColumns: "25% 50% 25%" }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: sub.color }}
                                  />
                                  <span className="text-xs font-medium">
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
                                  className="text-sm"
                                />
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="R$ 0.00"
                                  value={entry.amount}
                                  onChange={(e) => {
                                    let value = e.target.value.replace(/[^\d.,-]/g, "");
                                    value = value.replace(",", ".");
                                    const parts = value.split(".");
                                    if (parts.length > 2) {
                                      value = parts[0] + "." + parts.slice(1).join("");
                                    }
                                    updateEntry(sub.id, "amount", value, true);
                                  }}
                                  className="text-right font-semibold text-sm"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep("month")}
                    className="flex-1 h-9 text-sm"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep("expenses")}
                    className="flex-1 h-9 text-sm"
                  >
                    Próximo: Despesas
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Expenses */}
            {step === "expenses" && (
              <div className="space-y-2">
                {/* Summary Card with Visual Progress - Only for non-casa accounts */}
                {accountType !== "casa" && (
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-lg border border-primary/20 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Receitas</p>
                        <p className="text-base font-bold text-green-600 dark:text-green-400">
                          R$ {totalIncome.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Despesas</p>
                        <p className="text-base font-bold text-red-600 dark:text-red-400">
                          R$ {totalExpenses.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Saldo</p>
                        <p
                          className={cn(
                            "text-base font-bold",
                            balance >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          R$ {balance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Orçamento Utilizado
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            totalExpenses > totalIncome
                              ? "text-red-600 dark:text-red-400"
                              : totalExpenses === totalIncome
                              ? "text-green-600 dark:text-green-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {totalIncome > 0
                            ? ((totalExpenses / totalIncome) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      
                      <div className="relative h-6 bg-muted rounded-full overflow-hidden border">
                        {/* Base background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted" />
                        
                        {/* Filled portion */}
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-full",
                            totalExpenses > totalIncome
                              ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500"
                              : totalExpenses === totalIncome
                              ? "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500"
                              : "bg-gradient-to-r from-primary to-primary/80"
                          )}
                          style={{
                            width: `${Math.min((totalExpenses / Math.max(totalIncome, totalExpenses)) * 100, 100)}%`,
                          }}
                        >
                          {/* Animated shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                        
                        {/* 100% marker line */}
                        {totalExpenses > totalIncome && (
                          <div
                            className="absolute inset-y-0 w-0.5 bg-white/50"
                            style={{
                              left: `${(totalIncome / totalExpenses) * 100}%`,
                            }}
                          />
                        )}
                        
                        {/* Center text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-foreground drop-shadow-lg">
                            {totalExpenses > totalIncome && (
                              <>Excedeu em R$ {(totalExpenses - totalIncome).toFixed(2)}</>
                            )}
                            {totalExpenses < totalIncome && (
                              <>Restam R$ {(totalIncome - totalExpenses).toFixed(2)}</>
                            )}
                            {totalExpenses === totalIncome && totalIncome > 0 && (
                              <>Orçamento Completo!</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Status message */}
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        {totalExpenses > totalIncome ? (
                          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <TrendingDown className="h-3 w-3" />
                            <span className="font-medium">
                              Suas despesas excedem a receita prevista
                            </span>
                          </div>
                        ) : totalExpenses < totalIncome ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <span className="font-medium">
                              Você ainda tem R$ {(totalIncome - totalExpenses).toFixed(2)} para alocar
                            </span>
                          </div>
                        ) : totalIncome > 0 ? (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            <span className="font-medium">
                              Orçamento equilibrado perfeitamente!
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Header for casa accounts */}
                {accountType === "casa" && (
                  <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 p-3 rounded-lg border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="font-semibold text-sm">
                          {format(workingMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Despesas</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          R$ {totalExpenses.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ScrollArea className={cn(accountType === "casa" ? "h-[440px]" : "h-[350px]", "pr-4")}>
                  <div className="space-y-1.5">
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
                                className="bg-muted/50 p-2 flex items-center gap-2 hover:bg-muted transition-colors"
                                style={{
                                  borderLeft: `4px solid ${group.color}`,
                                }}
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                <span className="font-semibold text-sm">{group.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {group.subcategories.length} subcategorias
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="p-3 space-y-2">
                                {group.subcategories.map((sub) => {
                                  const entry = getEntryValue(sub.id, expenseEntries);
                                  return (
                                    <div
                                      key={sub.id}
                                      className="grid gap-2 p-2 rounded-lg border bg-card"
                                      style={{ gridTemplateColumns: "25% 50% 25%" }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <div
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: sub.color }}
                                        />
                                        <span className="text-xs font-medium">
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
                                        className="text-sm"
                                      />
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="R$ 0.00"
                                        value={entry.amount}
                                        onChange={(e) => {
                                          let value = e.target.value.replace(/[^\d.,-]/g, "");
                                          value = value.replace(",", ".");
                                          const parts = value.split(".");
                                          if (parts.length > 2) {
                                            value = parts[0] + "." + parts.slice(1).join("");
                                          }
                                          updateEntry(sub.id, "amount", value, false);
                                        }}
                                        className="text-right font-semibold text-sm"
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

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(accountType === "casa" ? "month" : "income")}
                    className="flex-1 h-9 text-sm"
                  >
                    Voltar
                  </Button>
                  <Button onClick={handleFinish} className="flex-1 h-9 text-sm">
                    <Check className="mr-2 h-3 w-3" />
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
