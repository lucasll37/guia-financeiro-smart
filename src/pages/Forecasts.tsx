import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Wand2, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { ForecastsTable } from "@/components/forecasts/ForecastsTable";
import { ForecastDialog } from "@/components/forecasts/ForecastDialog";
import { ForecastFilters } from "@/components/forecasts/ForecastFilters";
import { BudgetWizard } from "@/components/forecasts/BudgetWizard";
import { TabularYearView } from "@/components/forecasts/TabularYearView";
import { useAccountEditPermissions } from "@/hooks/useAccountEditPermissions";
import { CasaRevenueSplitManager } from "@/components/accounts/CasaRevenueSplitManager";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ForecastsProps {
  accountId?: string;
}

export default function Forecasts({ accountId: propAccountId }: ForecastsProps) {
  const { accounts } = useAccounts();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  
  const [filters, setFilters] = useState({
    accountId: propAccountId || "all",
    startDate: format(startOfMonth(today), "yyyy-MM-dd"),
    endDate: format(endOfMonth(today), "yyyy-MM-dd"),
    viewMode: "monthly" as "monthly" | "custom",
    selectedMonth: currentMonth,
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<any>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetMonth, setCopyTargetMonth] = useState<Date | undefined>(undefined);
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Update filters when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setFilters(prev => ({ ...prev, accountId: propAccountId }));
    }
  }, [propAccountId]);

  // Check if should auto-open wizard from URL parameter
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    if (shouldCreate === 'true') {
      setWizardOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { categories } = useCategories(filters.accountId !== "all" ? filters.accountId : undefined);
  const selectedAccount = accounts?.find(a => a.id === filters.accountId);
  
  const { forecasts, isLoading, createForecast, updateForecast, deleteForecast, copyForecast } = useForecasts(
    filters.accountId !== "all" ? filters.accountId : null
  );

  const { data: canEdit = false } = useAccountEditPermissions(
    filters.accountId !== "all" ? filters.accountId : undefined
  );

  // Generate month options for copy dialog (6 months before and after current month)
  const monthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Filter forecasts by selected period
  const filteredForecasts = useMemo(() => {
    if (!forecasts) return [];
    
    const startDate = parseISO(filters.startDate);
    const endDate = parseISO(filters.endDate);
    
    return forecasts.filter((f) => {
      const forecastStart = parseISO(f.period_start);
      return forecastStart >= startDate && forecastStart <= endDate;
    });
  }, [forecasts, filters.startDate, filters.endDate]);

  const handleCreateForecast = () => {
    setSelectedForecast(null);
    setDialogOpen(true);
  };

  const handleEditForecast = (forecast: any) => {
    setSelectedForecast(forecast);
    setDialogOpen(true);
  };

  const handleSaveForecast = async (forecastData: any) => {
    if (selectedForecast) {
      await updateForecast.mutateAsync({ ...forecastData, id: selectedForecast.id });
    } else {
      await createForecast.mutateAsync(forecastData);
    }
    setDialogOpen(false);
    setSelectedForecast(null);
  };

  const handleDeleteForecast = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta previsão?")) return;
    await deleteForecast.mutateAsync(id);
  };

  const handleCopyForecast = async () => {
    if (!copyTargetMonth || filters.accountId === "all") return;

    const [y, m] = filters.selectedMonth.split("-").map(Number);
    const sourceDate = new Date(y, (m || 1) - 1, 1);
    const sourcePeriodStart = format(startOfMonth(sourceDate), "yyyy-MM-dd");
    
    const targetPeriodStart = format(startOfMonth(copyTargetMonth), "yyyy-MM-dd");
    const targetPeriodEnd = format(endOfMonth(copyTargetMonth), "yyyy-MM-dd");

    await copyForecast.mutateAsync({
      sourcePeriodStart,
      targetPeriodStart,
      targetPeriodEnd,
      accountId: filters.accountId,
      isCasaAccount: selectedAccount?.type === "casa",
    });

    setCopyDialogOpen(false);
    setCopyTargetMonth(undefined);
  };

  const handleWizardSave = async (forecasts: any[]) => {
    try {
      // Salvar/atualizar todas as previsões diretamente sem notificações individuais
      for (const forecast of forecasts) {
        if (forecast.id) {
          // Atualizar existente
          const { id, ...updates } = forecast;
          const { error } = await supabase
            .from("account_period_forecasts")
            .update(updates)
            .eq("id", id);
          
          if (error) throw error;
        } else {
          // Criar nova
          const { id, ...createData } = forecast;
          const { error } = await supabase
            .from("account_period_forecasts")
            .insert(createData);
          
          if (error) throw error;
        }
      }

      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      queryClient.invalidateQueries({ queryKey: ["expense-forecasts"] });

      // Mostrar uma única notificação de sucesso ao final
      toast({
        title: "Previsões salvas",
        description: `${forecasts.length} previsão(ões) salva(s) com sucesso`,
      });

      // Após salvar, alinhar o mês selecionado com o mês salvo no assistente
      const savedPeriodStart = forecasts[0]?.period_start;
      if (savedPeriodStart) {
        const d = new Date(savedPeriodStart);
        const ym = format(d, "yyyy-MM");
        setFilters(prev => ({
          ...prev,
          selectedMonth: ym,
          startDate: format(startOfMonth(d), "yyyy-MM-dd"),
          endDate: format(endOfMonth(d), "yyyy-MM-dd"),
        }));
      }
      // Nota: triggers no backend já recalculam receitas automaticamente
    } catch (error: any) {
      toast({
        title: "Erro ao salvar previsões",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Previsões</h1>
            <p className="text-muted-foreground">
              Gerencie suas previsões de receitas e despesas por mês
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <span className="text-sm text-muted-foreground hidden lg:inline">
              Nova previsão:
            </span>
            <Button
              onClick={() => setWizardOpen(true)}
              disabled={filters.accountId === "all" || !canEdit}
              className="gap-2"
              size={isMobile ? "sm" : "default"}
            >
              <Wand2 className="h-4 w-4" />
              <span>Assistente de Lançamento</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCreateForecast} 
              disabled={filters.accountId === "all" || !canEdit}
              className="gap-2"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-4 w-4" />
              <span>Manual</span>
            </Button>
            {filters.viewMode === "monthly" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Define o mês default como o mesmo mês de origem
                    const sourceDate = parseISO(filters.selectedMonth + "-01");
                    setCopyTargetMonth(sourceDate);
                    setCopyDialogOpen(true);
                  }}
                  disabled={filters.accountId === "all" || filteredForecasts.length === 0 || !canEdit}
                  className="gap-2"
                  size={isMobile ? "sm" : "default"}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copiar</span>
                </Button>
                {selectedAccount?.type === "casa" && filters.accountId !== "all" && (
                  <CasaRevenueSplitManager 
                    accountId={filters.accountId} 
                    periodStart={filters.selectedMonth + "-01"}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ForecastFilters
            accounts={accounts || []}
            filters={filters}
            onFilterChange={setFilters}
            accountId={propAccountId}
            isCasaAccount={selectedAccount?.type === "casa"}
          />
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="tabular" disabled={filters.accountId === "all"}>
            Visão Tabular
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando previsões...</p>
          ) : (
            <ForecastsTable
              forecasts={filteredForecasts}
              onEdit={handleEditForecast}
              onDelete={handleDeleteForecast}
              showAccountName={filters.accountId === "all"}
              viewMode={filters.viewMode}
              onViewModeChange={(mode) => setFilters(prev => ({ ...prev, viewMode: mode }))}
              categories={categories || []}
              canEdit={canEdit}
              accountType={selectedAccount?.type}
            />
          )}
        </TabsContent>

        <TabsContent value="tabular">
          {filters.accountId !== "all" && (
            <TabularYearView
              accountId={filters.accountId}
              accountType={selectedAccount?.type}
            />
          )}
        </TabsContent>
      </Tabs>

      <ForecastDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveForecast}
        forecast={selectedForecast}
        accountId={filters.accountId !== "all" ? filters.accountId : ""}
        categories={categories || []}
        selectedMonth={filters.selectedMonth}
        accountType={filters.accountId !== "all" ? accounts?.find(a => a.id === filters.accountId)?.type : undefined}
      />

      <BudgetWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSave={handleWizardSave}
        accountId={filters.accountId !== "all" ? filters.accountId : ""}
        categories={categories || []}
        selectedMonth={filters.selectedMonth}
        accountType={filters.accountId !== "all" ? accounts?.find(a => a.id === filters.accountId)?.type : undefined}
      />

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar Previsões</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAccount?.type === "casa" 
                ? `Copiar apenas as despesas previstas de ${format(parseISO(filters.selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })} para qual mês? (As receitas serão calculadas automaticamente)`
                : `Copiar todas as previsões de ${format(parseISO(filters.selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })} para qual mês?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Mês de destino</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCopyTargetMonth(prev => prev ? subMonths(prev, 1) : subMonths(new Date(), 1))}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !copyTargetMonth && "text-muted-foreground"
                    )}
                  >
                    {copyTargetMonth ? (
                      format(copyTargetMonth, "MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione o mês</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={copyTargetMonth}
                    onSelect={(date) => setCopyTargetMonth(date)}
                    disabled={(date) =>
                      date < new Date("1900-01-01")
                    }
                    initialFocus
                    defaultMonth={copyTargetMonth || new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCopyTargetMonth(prev => prev ? addMonths(prev, 1) : addMonths(new Date(), 1))}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyForecast} disabled={!copyTargetMonth}>
              Copiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
