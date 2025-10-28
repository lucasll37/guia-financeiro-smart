import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface ForecastFiltersProps {
  accounts: Account[];
  filters: {
    accountId: string;
    viewMode: "monthly" | "custom";
    selectedMonth: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (filters: any) => void;
}

export function ForecastFilters({ accounts, filters, onFilterChange }: ForecastFiltersProps) {
  // Generate month options based on view mode
  const monthOptions = useMemo(() => {
    const options = [];
    
    if (filters.viewMode === "custom" && filters.startDate && filters.endDate) {
      const start = startOfMonth(new Date(filters.startDate));
      const end = startOfMonth(new Date(filters.endDate));
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
  }, [filters.viewMode, filters.startDate, filters.endDate]);

  const handleMonthChange = (month: string) => {
    onFilterChange({
      ...filters,
      selectedMonth: month,
    });
  };

  const toggleViewMode = () => {
    const newMode = filters.viewMode === "monthly" ? "custom" : "monthly";
    
    if (newMode === "monthly") {
      // Reset to current month when switching back to monthly view
      const currentMonth = format(new Date(), "yyyy-MM");
      onFilterChange({
        ...filters,
        viewMode: newMode,
        selectedMonth: currentMonth,
        startDate: "",
        endDate: "",
      });
    } else {
      onFilterChange({
        ...filters,
        viewMode: newMode,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {filters.viewMode === "monthly" ? "Visualização Mensal" : "Período Personalizado"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleViewMode}
        >
          {filters.viewMode === "monthly" ? "Personalizar Período" : "Voltar para Mensal"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
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

        {filters.viewMode === "monthly" ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="month-filter">Mês</Label>
            <Select
              value={filters.selectedMonth}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger id="month-filter">
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
                    {filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate ? new Date(filters.startDate) : undefined}
                    onSelect={(date) => date && onFilterChange({ ...filters, startDate: format(date, "yyyy-MM-dd") })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
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
                    {filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate ? new Date(filters.endDate) : undefined}
                    onSelect={(date) => date && onFilterChange({ ...filters, endDate: format(date, "yyyy-MM-dd") })}
                    disabled={(date) => filters.startDate ? date < new Date(filters.startDate) : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
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
