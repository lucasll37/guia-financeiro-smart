import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";
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

  const toggleExpand = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Moeda</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma conta cadastrada
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
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
                      {account.is_shared && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onManageMembers(account)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(account.id)}
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
