import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { AccountPeriodDetails } from "./AccountPeriodDetails";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface AccountsTableProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onManageMembers: (account: Account) => void;
}

const accountTypeLabels: Record<string, string> = {
  pessoal: "Pessoal",
  casa: "Casa",
  empresa: "Empresa",
  conjugal: "Conjugal",
  outro: "Outro",
};

export function AccountsTable({ accounts, onEdit, onDelete, onManageMembers }: AccountsTableProps) {
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'type' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleExpand = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  const handleSort = (field: 'name' | 'type') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'type') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedAccounts = useMemo(() => {
    if (!sortField) return accounts;
    
    return [...accounts].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [accounts, sortField, sortDirection]);

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="flex items-center gap-1 p-0 h-auto font-medium">
                Nome
                {renderSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="flex items-center gap-1 p-0 h-auto font-medium">
                Tipo
                {renderSortIcon('type')}
              </Button>
            </TableHead>
            <TableHead>Moeda</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAccounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma conta cadastrada
              </TableCell>
            </TableRow>
          ) : (
            sortedAccounts.map((account) => (
              <>
                <TableRow 
                  key={account.id}
                  className={expandedAccount === account.id ? "bg-green-50 dark:bg-green-950/20" : ""}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpand(account.id)}
                    >
                      {expandedAccount === account.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{accountTypeLabels[account.type] || account.type}</TableCell>
                  <TableCell>{account.currency}</TableCell>
                  <TableCell>
                    {account.is_shared ? (
                      <Badge variant="secondary">Compartilhada</Badge>
                    ) : (
                      <Badge variant="outline">Individual</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onManageMembers(account)}
                        title="Gerenciar Membros"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(account)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(account.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedAccount === account.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <AccountPeriodDetails account={account} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
