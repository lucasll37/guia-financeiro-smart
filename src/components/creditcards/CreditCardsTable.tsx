import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
}

export function CreditCardsTable({
  creditCards,
  transactions,
  onEdit,
  onDelete,
}: CreditCardsTableProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { formatCurrency } = useUserPreferences();

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
        const key = t.payment_month;
        if (!byMonth.has(key)) {
          byMonth.set(key, []);
        }
        byMonth.get(key)!.push(t);
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
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum cartão cadastrado
              </TableCell>
            </TableRow>
          ) : (
            sortedCreditCards.map((card) => {
              const isExpanded = expandedCards.has(card.id);
              const monthlyTransactions = getTransactionsByMonth(card.id);
              const totalToPay = getCardTotal(card.id);

              return (
                <>
                  <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleCard(card.id)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isCardExpanded(card.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{card.name}</TableCell>
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(card.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isCardExpanded(card.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <div className="bg-muted/30 p-4 md:p-6">
                          <h4 className="font-semibold mb-4 text-base md:text-lg">Faturas por Mês</h4>
                          {monthlyTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                          ) : (
                            <Accordion type="multiple" className="space-y-2">
                              {monthlyTransactions.map(([month, txs]) => {
                                const monthTotal = txs.reduce((sum, t) => sum + Number(t.amount), 0);
                                return (
                                  <AccordionItem 
                                    key={month} 
                                    value={month}
                                    className="border rounded-lg bg-background shadow-sm overflow-hidden"
                                  >
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                                      <div className="flex flex-1 justify-between items-center pr-4">
                                        <h5 className="font-semibold text-base capitalize">
                                          {new Date(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </h5>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-muted-foreground">Total:</span>
                                          <span className="font-bold text-destructive text-base">
                                            {formatCurrency(monthTotal)}
                                          </span>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                      <div className="border-t pl-8">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                              <TableHead className="h-9 text-xs">Data</TableHead>
                                              <TableHead className="h-9 text-xs">Descrição</TableHead>
                                              <TableHead className="h-9 text-xs">Categoria</TableHead>
                                              <TableHead className="h-9 text-xs text-right">Valor</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {txs.map(t => (
                                              <TableRow key={t.id} className="hover:bg-muted/20">
                                                <TableCell className="text-xs py-2">
                                                  {new Date(t.date).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="text-sm py-2">
                                                  {t.description}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                  {t.categories && (
                                                    <div className="flex items-center gap-2">
                                                      <div 
                                                        className="h-3 w-3 rounded-full flex-shrink-0" 
                                                        style={{ backgroundColor: t.categories.color }}
                                                      />
                                                      <span className="text-xs text-muted-foreground truncate">
                                                        {t.categories.name}
                                                      </span>
                                                    </div>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium py-2">
                                                  {formatCurrency(Number(t.amount))}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
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
