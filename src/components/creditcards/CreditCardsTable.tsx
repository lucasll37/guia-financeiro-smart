import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
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
                A Pagar
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
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <div className="bg-muted/30 p-4">
                          <h4 className="font-semibold mb-3">Faturas por Mês</h4>
                          {monthlyTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                          ) : (
                            <div className="space-y-4">
                              {monthlyTransactions.map(([month, txs]) => {
                                const monthTotal = txs.reduce((sum, t) => sum + Number(t.amount), 0);
                                return (
                                  <div key={month} className="border rounded-lg p-3 bg-background">
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="font-medium">
                                        {new Date(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                      </h5>
                                      <span className="font-semibold text-destructive">
                                        {formatCurrency(monthTotal)}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {txs.map(t => (
                                        <div key={t.id} className="flex justify-between text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">
                                              {new Date(t.date).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span>{t.description}</span>
                                          </div>
                                          <span>{formatCurrency(t.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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
