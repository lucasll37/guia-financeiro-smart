import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface ForecastFiltersProps {
  accounts: Account[];
  filters: {
    accountId: string;
    startDate: string;
    endDate: string;
    viewMode: "monthly" | "custom";
    selectedMonth: string;
  };
  onFilterChange: (filters: any) => void;
  accountId?: string;
  isCasaAccount?: boolean;
}

export function ForecastFilters({ accounts, filters, onFilterChange, accountId, isCasaAccount }: ForecastFiltersProps) {
  const handleMonthChange = (date: Date | undefined) => {
    if (!date) return;
    
    const month = format(date, "yyyy-MM");
    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
    
    onFilterChange({
      ...filters,
      selectedMonth: month,
      startDate,
      endDate,
    });
  };

  const toggleViewMode = () => {
    const newMode = filters.viewMode === "monthly" ? "custom" : "monthly";
    
    if (newMode === "monthly") {
      // Reset to current month when switching back to monthly view
      handleMonthChange(new Date());
    } else {
      // When switching to custom view, set start date to first day of current year
      // and end date to last day of current year
      const today = new Date();
      const firstDayOfYear = startOfYear(today);
      const lastDayOfYear = endOfYear(today);
      
      const startDate = format(firstDayOfYear, "yyyy-MM-dd");
      const endDate = format(lastDayOfYear, "yyyy-MM-dd");
      
      onFilterChange({
        ...filters,
        viewMode: newMode,
        startDate,
        endDate,
      });
      return;
    }
    
    onFilterChange({
      ...filters,
      viewMode: newMode,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {filters.viewMode === "monthly" ? "Visualização Mensal" : "Período Personalizado"}
          </span>
        </div>
        {!isCasaAccount && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
          >
            {filters.viewMode === "monthly" ? "Personalizar Período" : "Voltar para Mensal"}
          </Button>
        )}
      </div>

      <div className={`grid gap-4 p-4 border rounded-lg bg-card ${accountId ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
      {!accountId && (
        <div className="space-y-2">
          <Label htmlFor="account-filter">Conta</Label>
          <Select
            value={filters.accountId}
            onValueChange={(value) => onFilterChange({ ...filters, accountId: value })}
          >
            <SelectTrigger id="account-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filters.viewMode === "monthly" ? (
        <div className={`space-y-2 ${accountId ? 'md:col-span-3' : 'md:col-span-3'}`}>
          <Label htmlFor="month-filter">Mês</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="month-filter"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.selectedMonth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.selectedMonth 
                  ? format(new Date(filters.selectedMonth + "-01T00:00:00"), "MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecione o mês"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.selectedMonth ? new Date(filters.selectedMonth + "-01T00:00:00") : undefined}
                onSelect={handleMonthChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(new Date(filters.startDate + "T00:00:00"), "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.startDate ? new Date(filters.startDate + "T00:00:00") : undefined}
                  onSelect={(date) => date && onFilterChange({ ...filters, startDate: format(date, "yyyy-MM-dd") })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(new Date(filters.endDate + "T00:00:00"), "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.endDate ? new Date(filters.endDate + "T00:00:00") : undefined}
                  onSelect={(date) => date && onFilterChange({ ...filters, endDate: format(date, "yyyy-MM-dd") })}
                  disabled={(date) => (filters.startDate ? date < new Date(filters.startDate + "T00:00:00") : false)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
