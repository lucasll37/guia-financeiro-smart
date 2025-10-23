import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
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
  };
  onFilterChange: (filters: any) => void;
}

export function TransactionFilters({ accounts, categories, filters, onFilterChange }: TransactionFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 border rounded-lg bg-card">
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

      <div className="space-y-2">
        <Label htmlFor="start-date">Data Início</Label>
        <Input
          id="start-date"
          type="date"
          value={filters.startDate}
          onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date">Data Fim</Label>
        <Input
          id="end-date"
          type="date"
          value={filters.endDate}
          onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
        />
      </div>

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
  );
}
