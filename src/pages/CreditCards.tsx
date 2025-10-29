import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/use-toast";
import { CreditCardsTable } from "@/components/creditcards/CreditCardsTable";
import { CreditCardDialog } from "@/components/creditcards/CreditCardDialog";
import { CreditCardFilters } from "@/components/creditcards/CreditCardFilters";
import type { Database } from "@/integrations/supabase/types";

type CreditCardInsert = Database["public"]["Tables"]["credit_cards"]["Insert"];

interface CreditCardsProps {
  accountId?: string;
}

export default function CreditCards({ accountId: propAccountId }: CreditCardsProps) {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { canCreateCreditCard, maxCreditCards, userPlan } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  
  const [filters, setFilters] = useState({
    accountId: propAccountId || "all",
    startDate: format(startOfMonth(today), "yyyy-MM-dd"),
    endDate: format(endOfMonth(today), "yyyy-MM-dd"),
    viewMode: "monthly" as "monthly" | "custom",
    selectedMonth: currentMonth,
  });
  
  // Update filters when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setFilters(prev => ({ ...prev, accountId: propAccountId }));
    }
  }, [propAccountId]);

  const { creditCards, isLoading, createCreditCard, updateCreditCard, deleteCreditCard } =
    useCreditCards(filters.accountId !== "all" ? filters.accountId : undefined);

  const { transactions } = useTransactions(filters.accountId !== "all" ? filters.accountId : undefined);

  // Filtrar transações por período
  const filteredTransactions = transactions?.filter((t) => {
    if (!t.credit_card_id || !t.payment_month) return false;
    const paymentDate = new Date(t.payment_month);
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    return paymentDate >= start && paymentDate <= end;
  }) || [];

  const handleCreateCard = async () => {
    // Get the account ID to check
    const accountIdToCheck = filters.accountId !== "all" ? filters.accountId : accounts?.[0]?.id;
    
    if (!accountIdToCheck) {
      toast({
        title: "Selecione uma conta",
        description: "Selecione uma conta específica para adicionar um cartão de crédito.",
        variant: "destructive",
      });
      return;
    }

    const canCreate = await canCreateCreditCard(accountIdToCheck);
    
    if (!canCreate) {
      toast({
        title: "Limite atingido",
        description: `Seu plano ${userPlan.toUpperCase()} permite até ${maxCreditCards} cartão${maxCreditCards > 1 ? 'ões' : ''} de crédito por conta. Faça upgrade para criar mais cartões.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedCard(null);
    setDialogOpen(true);
  };

  const handleEditCard = (card: any) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleSaveCard = async (cardData: CreditCardInsert) => {
    if (selectedCard) {
      await updateCreditCard.mutateAsync({ ...cardData, id: selectedCard.id });
    } else {
      await createCreditCard.mutateAsync(cardData);
    }
    setDialogOpen(false);
    setSelectedCard(null);
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return;
    await deleteCreditCard.mutateAsync(id);
  };

  const handleShowForecast = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "Sem lançamentos",
        description: "Não há lançamentos para visualizar",
        variant: "destructive",
      });
      return;
    }

    // Find the earliest and latest transaction dates
    const cardTransactions = transactions.filter(t => t.credit_card_id);
    
    if (cardTransactions.length === 0) {
      toast({
        title: "Sem lançamentos",
        description: "Não há lançamentos de cartão para visualizar",
        variant: "destructive",
      });
      return;
    }

    // Get all payment months
    const paymentMonths = cardTransactions
      .filter(t => t.payment_month)
      .map(t => new Date(t.payment_month!));

    // Also include transaction dates for transactions without payment_month
    const transactionDates = cardTransactions
      .filter(t => !t.payment_month)
      .map(t => new Date(t.date));

    const allDates = [...paymentMonths, ...transactionDates];
    
    if (allDates.length === 0) {
      toast({
        title: "Sem datas",
        description: "Não há datas de pagamento para visualizar",
        variant: "destructive",
      });
      return;
    }

    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Check if there are recurring transactions
    const hasRecurring = cardTransactions.some(t => t.is_recurring);
    
    // If there are recurring transactions, add 6 months to the latest date
    const endDate = hasRecurring 
      ? addMonths(latestDate, 6)
      : latestDate;

    const startDate = format(startOfMonth(earliestDate), "yyyy-MM-dd");
    const finalEndDate = format(endOfMonth(endDate), "yyyy-MM-dd");
    
    setFilters({
      ...filters,
      viewMode: "custom",
      startDate,
      endDate: finalEndDate,
    });

    // Calculate months difference properly
    const startMonth = earliestDate.getFullYear() * 12 + earliestDate.getMonth();
    const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
    const monthsDiff = endMonth - startMonth + 1; // +1 to include both start and end months
    
    toast({
      title: "Projeção expandida",
      description: `Visualizando ${monthsDiff} ${monthsDiff === 1 ? 'mês' : 'meses'} de lançamentos${hasRecurring ? ' (incluindo projeção de recorrentes)' : ''}`,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie seus cartões de crédito e controle de faturas
          </p>
        </div>
        <Button onClick={handleCreateCard}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Novo Cartão</span>}
        </Button>
      </div>

      <CreditCardFilters
        accounts={accounts || []}
        filters={filters}
        onFilterChange={setFilters}
        accountId={propAccountId}
        onShowForecast={handleShowForecast}
      />

      {isLoading ? (
        <p className="text-muted-foreground">Carregando cartões...</p>
      ) : (
        <CreditCardsTable
          creditCards={creditCards || []}
          transactions={filteredTransactions}
          onEdit={handleEditCard}
          onDelete={handleDeleteCard}
        />
      )}

      <CreditCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveCard}
        creditCard={selectedCard}
        accounts={accounts || []}
      />
    </div>
  );
}
