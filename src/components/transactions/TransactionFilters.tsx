import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  filters: {
    accountId: string;
    categoryId: string;
    type: string;
    startDate: string;
    endDate: string;
    search: string;
    viewMode: "monthly" | "custom";
    selectedMonth: string;
  };
  onFilterChange: (filters: any) => void;
  accountId?: string;
}

export function TransactionFilters({ accounts, categories, filters, onFilterChange, accountId }: TransactionFiltersProps) {
  // Generate month options (6 months before and after current month)
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

  const toggleViewMode = () => {
    const newMode = filters.viewMode === "monthly" ? "custom" : "monthly";
    
    if (newMode === "monthly") {
      // Reset to current month when switching back to monthly view
      const currentMonth = format(new Date(), "yyyy-MM");
      handleMonthChange(currentMonth);
    }
    
    onFilterChange({
      ...filters,
      viewMode: newMode,
    });
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

      <div className={`grid gap-4 p-4 border rounded-lg bg-card ${accountId ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6'}`}>
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

      <div className="space-y-2">
        <Label htmlFor="category-filter">Categoria</Label>
        <Select
          value={filters.categoryId}
          onValueChange={(value) => onFilterChange({ ...filters, categoryId: value })}
        >
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type-filter">Tipo</Label>
        <Select
          value={filters.type}
          onValueChange={(value) => onFilterChange({ ...filters, type: value })}
        >
          <SelectTrigger id="type-filter">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.viewMode === "monthly" ? (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="month-filter">Mês</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="month-filter"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.selectedMonth 
                  ? format(new Date(filters.selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecione o mês"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.selectedMonth ? new Date(filters.selectedMonth + "-01") : undefined}
                defaultMonth={filters.selectedMonth ? new Date(filters.selectedMonth + "-01") : new Date()}
                onSelect={(date) => {
                  if (date) {
                    const month = format(date, "yyyy-MM");
                    handleMonthChange(month);
                  }
                }}
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

      <div className="space-y-2">
        <Label htmlFor="search">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Descrição..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-8"
          />
        </div>
      </div>
      </div>
    </div>
  );
}
