import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface ForecastFiltersProps {
  accounts: Account[];
  filters: {
    accountId: string;
    selectedMonth: string;
  };
  onFilterChange: (filters: any) => void;
  accountId?: string;
}

export function ForecastFilters({ accounts, filters, onFilterChange, accountId }: ForecastFiltersProps) {
  // Generate month options: 6 months before and after current month
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
    onFilterChange({
      ...filters,
      selectedMonth: month,
    });
  };

  return (
    <div className={`grid grid-cols-1 ${accountId ? '' : 'md:grid-cols-2'} gap-4 p-4 border rounded-lg bg-card`}>
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

      <div className="space-y-2">
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
    </div>
  );
}
