import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useForecasts } from "@/hooks/useForecasts";
import { ForecastsTable } from "@/components/forecasts/ForecastsTable";
import { ForecastDialog } from "@/components/forecasts/ForecastDialog";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

export default function Forecasts() {
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<any>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetMonth, setCopyTargetMonth] = useState<string>("");
  const [periodMode, setPeriodMode] = useState<"default" | "custom">("default");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const { categories } = useCategories(selectedAccountId !== "all" ? selectedAccountId : undefined);
  const { forecasts, isLoading, createForecast, updateForecast, deleteForecast, copyForecast } = useForecasts(
    selectedAccountId !== "all" ? selectedAccountId : null
  );

  // Generate month options based on period mode
  const monthOptions = useMemo(() => {
    const options = [];
    
    if (periodMode === "custom" && customStartDate && customEndDate) {
      const start = startOfMonth(customStartDate);
      const end = startOfMonth(customEndDate);
      let current = start;
      
      while (current <= end) {
        options.push({
          value: format(current, "yyyy-MM"),
          label: format(current, "MMMM 'de' yyyy", { locale: ptBR }),
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    } else {
      // Default: 6 months before and after current month
      const current = new Date();
      for (let i = -6; i <= 6; i++) {
        const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
        options.push({
          value: format(date, "yyyy-MM"),
          label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
        });
      }
    }
    
    return options;
  }, [periodMode, customStartDate, customEndDate]);

  // Filter forecasts by selected month
  const filteredForecasts = useMemo(() => {
    if (!forecasts) return [];
    const periodStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
    return forecasts.filter((f) => f.period_start === periodStart);
  }, [forecasts, selectedMonth]);

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
    if (!copyTargetMonth || selectedAccountId === "all") return;

    const sourcePeriodStart = format(startOfMonth(new Date(selectedMonth + "-01")), "yyyy-MM-dd");
    const targetDate = new Date(copyTargetMonth + "-01");
    const targetPeriodStart = format(startOfMonth(targetDate), "yyyy-MM-dd");
    const targetPeriodEnd = format(endOfMonth(targetDate), "yyyy-MM-dd");

    await copyForecast.mutateAsync({
      sourcePeriodStart,
      targetPeriodStart,
      targetPeriodEnd,
      accountId: selectedAccountId,
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
            disabled={selectedAccountId === "all" || filteredForecasts.length === 0}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Mês
          </Button>
          <Button onClick={handleCreateForecast} disabled={selectedAccountId === "all"}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Previsão
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione a conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodMode} onValueChange={(value: "default" | "custom") => setPeriodMode(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Modo de período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão (6 meses)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {periodMode === "custom" ? (
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[250px] justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "PPP", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[250px] justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "PPP", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando previsões...</p>
      ) : (
        <ForecastsTable
          forecasts={filteredForecasts}
          onEdit={handleEditForecast}
          onDelete={handleDeleteForecast}
          showAccountName={selectedAccountId === "all"}
        />
      )}

      <ForecastDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveForecast}
        forecast={selectedForecast}
        accountId={selectedAccountId !== "all" ? selectedAccountId : ""}
        categories={categories || []}
        selectedMonth={selectedMonth}
      />

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar Previsões</AlertDialogTitle>
            <AlertDialogDescription>
              Copiar todas as previsões de {format(new Date(selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })} para qual mês?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={copyTargetMonth} onValueChange={setCopyTargetMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o mês de destino" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions
                .filter((opt) => opt.value !== selectedMonth)
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
