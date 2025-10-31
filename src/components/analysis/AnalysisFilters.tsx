import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfYear, endOfYear, parse, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface AnalysisFiltersProps {
  accounts: Account[];
  filters: {
    accountId: string;
    viewMode: "monthly" | "custom";
    selectedMonth: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (filters: any) => void;
  accountId?: string;
}

export function AnalysisFilters({ accounts, filters, onFilterChange, accountId }: AnalysisFiltersProps) {
  const handleMonthChange = (date: Date | undefined) => {
    if (!date) return;
    onFilterChange({
      ...filters,
      selectedMonth: format(date, "yyyy-MM"),
    });
  };

  const handlePreviousMonth = () => {
    const currentDate = parse(filters.selectedMonth, "yyyy-MM", new Date());
    const previousMonth = subMonths(currentDate, 1);
    onFilterChange({
      ...filters,
      selectedMonth: format(previousMonth, "yyyy-MM"),
    });
  };

  const handleNextMonth = () => {
    const currentDate = parse(filters.selectedMonth, "yyyy-MM", new Date());
    const nextMonth = addMonths(currentDate, 1);
    onFilterChange({
      ...filters,
      selectedMonth: format(nextMonth, "yyyy-MM"),
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
    }
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
          <Label>Mês de Referência</Label>
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
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.selectedMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.selectedMonth 
                    ? format(parse(filters.selectedMonth, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR })
                    : "Selecione o mês"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={parse(filters.selectedMonth, "yyyy-MM", new Date())}
                  onSelect={handleMonthChange}
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
