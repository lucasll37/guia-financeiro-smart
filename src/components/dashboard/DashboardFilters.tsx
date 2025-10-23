import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export interface DashboardFilters {
  dateFrom: Date;
  dateTo: Date;
  accountIds: string[];
  granularity: "month" | "quarter";
}

interface DashboardFiltersProps {
  accounts: Account[];
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onExport: () => void;
}

export function DashboardFiltersComponent({
  accounts,
  filters,
  onFiltersChange,
  onExport,
}: DashboardFiltersProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const handleAccountToggle = (accountId: string) => {
    const newAccountIds = filters.accountIds.includes(accountId)
      ? filters.accountIds.filter((id) => id !== accountId)
      : [...filters.accountIds, accountId];

    onFiltersChange({ ...filters, accountIds: newAccountIds });
  };

  const handleSelectAllAccounts = () => {
    onFiltersChange({
      ...filters,
      accountIds: accounts.map((a) => a.id),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Período:</label>
        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-[140px]",
                !filters.dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? (
                format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                "De"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(date) => {
                if (date) {
                  onFiltersChange({ ...filters, dateFrom: date });
                  setDateFromOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">até</span>

        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-[140px]",
                !filters.dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? (
                format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                "Até"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(date) => {
                if (date) {
                  onFiltersChange({ ...filters, dateTo: date });
                  setDateToOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Contas:</label>
        <Select
          value={
            filters.accountIds.length === accounts.length
              ? "all"
              : filters.accountIds[0] || ""
          }
          onValueChange={(value) => {
            if (value === "all") {
              handleSelectAllAccounts();
            } else {
              onFiltersChange({ ...filters, accountIds: [value] });
            }
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione as contas" />
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

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Granularidade:</label>
        <Select
          value={filters.granularity}
          onValueChange={(value: "month" | "quarter") =>
            onFiltersChange({ ...filters, granularity: value })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="quarter">Trimestral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onExport} variant="outline" className="ml-auto">
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>
    </div>
  );
}
