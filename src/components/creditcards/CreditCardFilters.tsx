import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, parse, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface CreditCardFiltersProps {
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
}

export function CreditCardFilters({ accounts, filters, onFilterChange, accountId }: CreditCardFiltersProps) {
  // Generate month options (6 months before and after current month)
  const monthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    for (let i = -6; i <= 12; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  const handleMonthChange = (month: string) => {
    const monthDate = new Date(month + "-01");
    const startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
    
    onFilterChange({
      ...filters,
      selectedMonth: month,
      startDate,
      endDate,
    });
  };

  const handlePreviousMonth = () => {
    const currentDate = parse(filters.selectedMonth, "yyyy-MM", new Date());
    const previousMonth = subMonths(currentDate, 1);
    handleMonthChange(format(previousMonth, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const currentDate = parse(filters.selectedMonth, "yyyy-MM", new Date());
    const nextMonth = addMonths(currentDate, 1);
    handleMonthChange(format(nextMonth, "yyyy-MM"));
  };

  const toggleViewMode = () => {
    const newMode = filters.viewMode === "monthly" ? "custom" : "monthly";
    
    if (newMode === "monthly") {
      // Reset to current month when switching back to monthly view
      const currentMonth = format(new Date(), "yyyy-MM");
      handleMonthChange(currentMonth);
    } else {
      // When switching to custom view, set start date to first day of current month
      // and end date to 5 years in the future
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const futureDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
      
      const startDate = format(firstDayOfMonth, "yyyy-MM-dd");
      const endDate = format(futureDate, "yyyy-MM-dd");
      
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
        <Button
          variant="outline"
          size="sm"
          onClick={toggleViewMode}
        >
          {filters.viewMode === "monthly" ? "Personalizar Período" : "Voltar para Mensal"}
        </Button>
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
                <SelectItem value="all">Todas</SelectItem>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="month-filter"
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.selectedMonth 
                      ? format(parse(filters.selectedMonth, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR })
                      : "Selecione o mês"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.selectedMonth ? parse(filters.selectedMonth, "yyyy-MM", new Date()) : undefined}
                    onSelect={(date) => date && handleMonthChange(format(date, "yyyy-MM"))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
                    {filters.startDate ? format(parse(filters.startDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate ? parse(filters.startDate, "yyyy-MM-dd", new Date()) : undefined}
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
                    {filters.endDate ? format(parse(filters.endDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate ? parse(filters.endDate, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => date && onFilterChange({ ...filters, endDate: format(date, "yyyy-MM-dd") })}
                    disabled={(date) => (filters.startDate ? date < parse(filters.startDate, "yyyy-MM-dd", new Date()) : false)}
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
