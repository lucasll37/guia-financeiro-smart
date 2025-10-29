import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CreditCardForecastDialog } from "./CreditCardForecastDialog";
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
  expandAll?: boolean;
}

export function CreditCardsTable({
  creditCards,
  transactions,
  onEdit,
  onDelete,
  expandAll = false,
}: CreditCardsTableProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'total' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [selectedCardForForecast, setSelectedCardForForecast] = useState<CreditCard | null>(null);
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
    return expandAll || expandedCards.has(cardId);
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
                          onClick={() => {
                            setSelectedCardForForecast(card);
                            setForecastDialogOpen(true);
                          }}
                          title="Ver projeção de faturas"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
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
                            <div className="space-y-4">
                              {monthlyTransactions.map(([month, txs]) => {
                                const monthTotal = txs.reduce((sum, t) => sum + Number(t.amount), 0);
                                return (
                                  <div key={month} className="border rounded-lg p-3 md:p-4 bg-background shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 pb-3 border-b">
                                      <h5 className="font-semibold text-base">
                                        {new Date(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                      </h5>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Total:</span>
                                        <span className="font-bold text-destructive text-lg">
                                          {formatCurrency(monthTotal)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      {txs.map(t => (
                                        <div key={t.id} className="flex flex-col sm:flex-row sm:justify-between gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                          <div className="flex flex-col gap-1 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs text-muted-foreground font-medium">
                                                {new Date(t.date).toLocaleDateString('pt-BR')}
                                              </span>
                                              {t.categories && (
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-xs"
                                                  style={{ 
                                                    borderColor: t.categories.color,
                                                    color: t.categories.color 
                                                  }}
                                                >
                                                  {t.categories.name}
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="font-medium">{t.description}</span>
                                          </div>
                                          <div className="flex items-center justify-between sm:justify-end gap-2">
                                            <span className="font-semibold text-lg">{formatCurrency(Number(t.amount))}</span>
                                          </div>
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

      {selectedCardForForecast && (
        <CreditCardForecastDialog
          open={forecastDialogOpen}
          onOpenChange={setForecastDialogOpen}
          creditCard={selectedCardForForecast}
          transactions={transactions}
        />
      )}
    </div>
  );
}
