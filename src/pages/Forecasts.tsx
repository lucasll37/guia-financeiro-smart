import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { ForecastsTable } from "@/components/forecasts/ForecastsTable";
import { ForecastDialog } from "@/components/forecasts/ForecastDialog";
import { ForecastFilters } from "@/components/forecasts/ForecastFilters";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const currentMonth = format(new Date(), "yyyy-MM");
  
  const [filters, setFilters] = useState({
    accountId: propAccountId || "all",
    selectedMonth: currentMonth,
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<any>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetMonth, setCopyTargetMonth] = useState<string>("");
  
  // Update filters when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setFilters(prev => ({ ...prev, accountId: propAccountId }));
    }
  }, [propAccountId]);

  const { categories } = useCategories(filters.accountId !== "all" ? filters.accountId : undefined);
  const { forecasts, isLoading, createForecast, updateForecast, deleteForecast, copyForecast } = useForecasts(
    filters.accountId !== "all" ? filters.accountId : null
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

  // Filter forecasts by selected month
  const filteredForecasts = useMemo(() => {
    if (!forecasts) return [];
    const periodStart = format(startOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd");
    return forecasts.filter((f) => f.period_start === periodStart);
  }, [forecasts, filters.selectedMonth]);

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

    const sourcePeriodStart = format(startOfMonth(new Date(filters.selectedMonth + "-01")), "yyyy-MM-dd");
    const targetDate = new Date(copyTargetMonth + "-01");
    const targetPeriodStart = format(startOfMonth(targetDate), "yyyy-MM-dd");
    const targetPeriodEnd = format(endOfMonth(targetDate), "yyyy-MM-dd");

    await copyForecast.mutateAsync({
      sourcePeriodStart,
      targetPeriodStart,
      targetPeriodEnd,
      accountId: filters.accountId,
    });

    setCopyDialogOpen(false);
    setCopyTargetMonth("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Previsões</h1>
          <p className="text-muted-foreground">
            Gerencie suas previsões de receitas e despesas por mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCopyDialogOpen(true)}
            disabled={filters.accountId === "all" || filteredForecasts.length === 0}
          >
            <Copy className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Copiar Mês</span>}
          </Button>
          <Button onClick={handleCreateForecast} disabled={filters.accountId === "all"}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Nova Previsão</span>}
          </Button>
        </div>
      </div>

      <ForecastFilters
        accounts={accounts || []}
        filters={filters}
        onFilterChange={setFilters}
        accountId={propAccountId}
      />

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando previsões...</p>
        ) : (
          <ForecastsTable
            forecasts={filteredForecasts}
            onEdit={handleEditForecast}
            onDelete={handleDeleteForecast}
            showAccountName={filters.accountId === "all"}
          />
        )}
      </div>

      <ForecastDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveForecast}
        forecast={selectedForecast}
        accountId={filters.accountId !== "all" ? filters.accountId : ""}
        categories={categories || []}
        selectedMonth={filters.selectedMonth}
      />

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar Previsões</AlertDialogTitle>
            <AlertDialogDescription>
              Copiar todas as previsões de {format(new Date(filters.selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })} para qual mês?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={copyTargetMonth} onValueChange={setCopyTargetMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o mês de destino" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions
                .filter((opt) => opt.value !== filters.selectedMonth)
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
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
