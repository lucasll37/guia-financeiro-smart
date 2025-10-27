import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
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

  const { creditCards, isLoading, createCreditCard, updateCreditCard, deleteCreditCard } =
    useCreditCards(selectedAccountId !== "all" ? selectedAccountId : undefined);

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
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando cartões...</p>
      ) : (
        <CreditCardsTable
          creditCards={creditCards || []}
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
