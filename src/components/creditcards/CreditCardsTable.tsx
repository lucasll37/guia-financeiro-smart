import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/hooks/useAuth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
};

interface CreditCardsTableProps {
  creditCards: CreditCard[];
  transactions: Transaction[];
  onEdit: (creditCard: CreditCard) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  accountMembers?: Array<{ user_id: string; user?: { name: string | null; email: string | null } | null }>;
}

export function CreditCardsTable({
  creditCards,
  transactions,
  onEdit,
  onDelete,
  canEdit = true,
  accountMembers = [],
}: CreditCardsTableProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { formatCurrency } = useUserPreferences();
  const { user } = useAuth();

  const getCreatorName = (createdBy: string) => {
    if (createdBy === user?.id) {
      const member = accountMembers.find(m => m.user_id === user?.id);
      return {
        name: member?.user?.name || user?.user_metadata?.name || 'Sem nome',
        email: member?.user?.email || user?.email || null
      };
    }
    const member = accountMembers.find(m => m.user_id === createdBy);
    return {
      name: member?.user?.name || 'Sem nome',
      email: member?.user?.email || null
    };
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSort = (field: 'name' | 'total') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'total') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const isCardExpanded = (cardId: string) => {
    return expandedCards.has(cardId);
  };

  const getCardTransactions = (cardId: string) => {
    return transactions.filter(t => t.credit_card_id === cardId);
  };

  const getCardTotal = (cardId: string) => {
    const cardTransactions = getCardTransactions(cardId);
    return cardTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getTransactionsByMonth = (cardId: string) => {
    const cardTransactions = getCardTransactions(cardId);
    const byMonth = new Map<string, Transaction[]>();
    
    cardTransactions.forEach(t => {
      if (t.payment_month) {
        // Extrair YYYY-MM da string diretamente, sem conversões de data
        const monthKey = (t.payment_month as string).substring(0, 7); // "2024-11-01" -> "2024-11"
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, []);
        }
        byMonth.get(monthKey)!.push(t);
      }
    });
    
    return Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const sortedCreditCards = useMemo(() => {
    if (!sortField) return creditCards;
    
    return [...creditCards].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'total') {
        comparison = getCardTotal(a.id) - getCardTotal(b.id);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [creditCards, sortField, sortDirection, transactions]);

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
            <TableHead className="text-center">Criado por</TableHead>
            <TableHead className="text-center">Fechamento</TableHead>
            <TableHead className="text-center">Vencimento</TableHead>
            <TableHead className="text-right">Limite</TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" size="sm" onClick={() => handleSort('total')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                Total a Pagar
                {renderSortIcon('total')}
              </Button>
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCreditCards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Nenhum cartão cadastrado
              </TableCell>
            </TableRow>
          ) : (
            sortedCreditCards.map((card) => {
              const isExpanded = expandedCards.has(card.id);
              const monthlyTransactions = getTransactionsByMonth(card.id);
              const totalToPay = getCardTotal(card.id);
              const creator = getCreatorName(card.created_by);

              return (
                <>
                  <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleCard(card.id)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isCardExpanded(card.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{card.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-medium">{creator.name}</div>
                        {creator.email && (
                          <div className="text-xs text-muted-foreground">{creator.email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">Dia {card.closing_day}</TableCell>
                    <TableCell className="text-center">Dia {card.due_day}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(card.credit_limit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-destructive">
                        {formatCurrency(totalToPay)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(card)}
                          disabled={!canEdit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(card.id)}
                          disabled={!canEdit}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isCardExpanded(card.id) && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0 bg-muted/20">
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">Faturas por Mês</h4>
                            <Badge variant="secondary" className="text-sm">
                              {monthlyTransactions.length} {monthlyTransactions.length === 1 ? 'fatura' : 'faturas'}
                            </Badge>
                          </div>
                          {monthlyTransactions.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                            </div>
                          ) : (
                            <Accordion type="multiple" className="space-y-3">
                              {monthlyTransactions.map(([month, txs]) => {
                                const monthTotal = txs.reduce((sum, t) => sum + Number(t.amount), 0);
                                return (
                                  <AccordionItem 
                                    key={month} 
                                    value={month}
                                    className="border-none rounded-xl bg-background shadow-sm overflow-hidden"
                                  >
                                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-all duration-200 [&[data-state=open]]:bg-muted/30">
                                       <div className="flex flex-1 justify-between items-center pr-4">
                                        <div className="flex flex-col items-start gap-1">
                                          <h5 className="font-semibold text-base capitalize">
                                            {/* Criar data válida adicionando -01 para evitar timezone issues */}
                                            {format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
                                          </h5>
                                          <span className="text-xs text-muted-foreground">
                                            {txs.length} {txs.length === 1 ? 'transação' : 'transações'}
                                          </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <span className="text-xs text-muted-foreground font-medium">Total da fatura</span>
                                          <span className="font-bold text-destructive text-lg">
                                            {formatCurrency(monthTotal)}
                                          </span>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                      <div className="border-t bg-muted/20">
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-muted/40 hover:bg-muted/40 border-none">
                                                <TableHead className="h-10 text-xs font-semibold">Data</TableHead>
                                                <TableHead className="h-10 text-xs font-semibold">Categoria</TableHead>
                                                <TableHead className="h-10 text-xs font-semibold">Descrição</TableHead>
                                                <TableHead className="h-10 text-xs font-semibold text-right">Valor</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {txs.map(t => (
                                                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                                                  <TableCell className="py-3 text-sm font-medium">
                                                    {new Date(t.date).toLocaleDateString('pt-BR')}
                                                  </TableCell>
                                                  <TableCell className="py-3">
                                                    {t.categories && (
                                                      <div className="flex items-center gap-2.5">
                                                        <div 
                                                          className="h-3 w-3 rounded-full flex-shrink-0 ring-1 ring-offset-1 ring-offset-background" 
                                                          style={{ backgroundColor: t.categories.color }}
                                                        />
                                                        <span className="text-sm text-foreground/90 truncate">
                                                          {t.categories.name}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="py-3 text-sm text-foreground/80">
                                                    {t.description}
                                                  </TableCell>
                                                  <TableCell className="text-right py-3 text-sm font-semibold">
                                                    {formatCurrency(Number(t.amount))}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
