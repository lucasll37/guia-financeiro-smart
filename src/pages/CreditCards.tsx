import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, addMonths, startOfMonth } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { CreditCardsTable } from "@/components/creditcards/CreditCardsTable";
import { CreditCardDialog } from "@/components/creditcards/CreditCardDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type CreditCardInsert = Database["public"]["Tables"]["credit_cards"]["Insert"];

export default function CreditCards() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  
  const today = new Date();
  const [startMonth, setStartMonth] = useState(format(today, "yyyy-MM"));
  const [endMonth, setEndMonth] = useState(format(addMonths(today, 6), "yyyy-MM"));

  const { creditCards, isLoading, createCreditCard, updateCreditCard, deleteCreditCard } =
    useCreditCards(selectedAccountId !== "all" ? selectedAccountId : undefined);

  const { transactions } = useTransactions(selectedAccountId !== "all" ? selectedAccountId : undefined);

  // Filtrar transações por período
  const filteredTransactions = transactions?.filter((t) => {
    if (!t.credit_card_id || !t.payment_month) return false;
    const paymentDate = new Date(t.payment_month);
    const start = startOfMonth(new Date(startMonth + "-01"));
    const end = startOfMonth(new Date(endMonth + "-01"));
    return paymentDate >= start && paymentDate <= end;
  }) || [];

  const handleCreateCard = () => {
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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões de crédito e controle de faturas
          </p>
        </div>
        <Button onClick={handleCreateCard}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filtrar por conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Label>Período:</Label>
          <Input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="w-40"
          />
          <span>até</span>
          <Input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

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
