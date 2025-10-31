import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight, FileText, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserActionLogs } from "@/hooks/useUserActionLogs";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // Contas
  create_account: { label: "Conta Criada", variant: "default" },
  update_account: { label: "Conta Editada", variant: "outline" },
  delete_account: { label: "Conta Apagada", variant: "destructive" },
  
  // Compartilhamento de Contas
  share_account: { label: "Conta Compartilhada", variant: "default" },
  update_account_share: { label: "Compartilhamento Atualizado", variant: "outline" },
  remove_account_share: { label: "Compartilhamento Removido", variant: "destructive" },
  
  // Lançamentos
  create_transaction: { label: "Transação Criada", variant: "secondary" },
  update_transaction: { label: "Transação Atualizada", variant: "outline" },
  delete_transaction: { label: "Transação Excluída", variant: "destructive" },
  
  // Previsões
  create_forecast: { label: "Previsão Criada", variant: "default" },
  update_forecast: { label: "Previsão Editada", variant: "outline" },
  delete_forecast: { label: "Previsão Apagada", variant: "destructive" },
  
  // Investimentos
  create_investment: { label: "Investimento Criado", variant: "default" },
  update_investment: { label: "Investimento Editado", variant: "outline" },
  delete_investment: { label: "Investimento Apagado", variant: "destructive" },
  
  // Compartilhamento de Investimentos
  share_investment: { label: "Investimento Compartilhado", variant: "default" },
  update_investment_share: { label: "Compartilhamento Atualizado", variant: "outline" },
  remove_investment_share: { label: "Compartilhamento Removido", variant: "destructive" },
  
  // Retornos Mensais
  create_monthly_return: { label: "Rentabilidade Registrada", variant: "default" },
  update_monthly_return: { label: "Rentabilidade Editada", variant: "outline" },
  delete_monthly_return: { label: "Rentabilidade Apagada", variant: "destructive" },
  
  // Metas
  create_goal: { label: "Meta Criada", variant: "default" },
  update_goal: { label: "Meta Editada", variant: "outline" },
  delete_goal: { label: "Meta Apagada", variant: "destructive" },
  
  // Cartões de Crédito
  create_credit_card: { label: "Cartão Criado", variant: "default" },
  update_credit_card: { label: "Cartão Editado", variant: "outline" },
  delete_credit_card: { label: "Cartão Apagado", variant: "destructive" },
};

const ENTITY_LABELS: Record<string, string> = {
  account: "Conta",
  account_member: "Compartilhamento de Conta",
  transaction: "Transação",
  forecast: "Previsão",
  goal: "Meta",
  investment: "Investimento",
  investment_member: "Compartilhamento de Investimento",
  monthly_return: "Rentabilidade Mensal",
  credit_card: "Cartão de Crédito",
};

export function UserActionLogs() {
  const [page, setPage] = useState(1);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [actionFilter, setActionFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["admin-users-search", searchEmail],
    queryFn: async () => {
      if (!searchEmail || searchEmail.length < 2) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name")
        .ilike("email", `%${searchEmail}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: searchEmail.length >= 2,
  });

  useEffect(() => {
    setSelectedUserId("");
  }, [searchEmail]);

  const { data: logsData, isLoading } = useUserActionLogs({
    page,
    itemsPerPage: ITEMS_PER_PAGE,
    searchEmail,
    actionFilter,
  });

  const totalPages = Math.ceil((logsData?.total || 0) / ITEMS_PER_PAGE);

  const uniqueActions = Object.keys(ACTION_LABELS);

  const getActionDescription = (log: any) => {
    const entityName = log.entity_type ? ENTITY_LABELS[log.entity_type] || log.entity_type : "Item";
    const actionLabel = ACTION_LABELS[log.action]?.label || log.action;
    
    return `${actionLabel} - ${entityName}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs de Ações dos Usuários
          </CardTitle>
          <CardDescription>
            Histórico de ações dos usuários. Os logs são mantidos conforme configuração de retenção.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar por Email</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedUserId && users?.find((u) => u.id === selectedUserId)
                      ? users.find((u) => u.id === selectedUserId)?.email
                      : "Buscar por email..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Digite o email do usuário..."
                      value={searchEmail}
                      onValueChange={(value) => {
                        setSearchEmail(value);
                        setPage(1);
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup>
                        {users?.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.email}
                            onSelect={() => {
                              setSelectedUserId(user.id);
                              setSearchEmail(user.email || "");
                              setOpen(false);
                              setPage(1);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{user.email}</span>
                              {user.name && (
                                <span className="text-sm text-muted-foreground">
                                  {user.name}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionFilter">Filtrar por Ação</Label>
              <select
                id="actionFilter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todas as ações</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Logs */}
          {isLoading ? (
            <p className="text-center py-8">Carregando logs...</p>
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="w-[300px]">Descrição</TableHead>
                      <TableHead className="w-[140px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.profiles?.name || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">
                              {log.profiles?.email || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">{getActionDescription(log)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ACTION_LABELS[log.action]?.variant || "default"}>
                            {ACTION_LABELS[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages} ({logsData.total} logs no total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
