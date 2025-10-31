import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type CreditCardInsert = Database["public"]["Tables"]["credit_cards"]["Insert"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (creditCard: CreditCardInsert) => void;
  creditCard?: CreditCard | null;
  accounts: Account[];
}

export function CreditCardDialog({
  open,
  onOpenChange,
  onSave,
  creditCard,
  accounts,
}: CreditCardDialogProps) {
  const [formData, setFormData] = useState<CreditCardInsert>({
    account_id: "",
    name: "",
    closing_day: 5,
    due_day: 15,
    credit_limit: undefined,
  });

  useEffect(() => {
    if (creditCard) {
      setFormData({
        account_id: creditCard.account_id,
        name: creditCard.name,
        closing_day: creditCard.closing_day,
        due_day: creditCard.due_day,
        credit_limit: creditCard.credit_limit || undefined,
      });
    } else {
      setFormData({
        account_id: accounts[0]?.id || "",
        name: "",
        closing_day: 5,
        due_day: 15,
        credit_limit: undefined,
      });
    }
  }, [creditCard, accounts, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {creditCard ? "Editar Cartão" : "Novo Cartão de Crédito"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Conta</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) =>
                setFormData({ ...formData, account_id: value })
              }
            >
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cartão</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Nubank Gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closing_day">Dia de Fechamento</Label>
              <Input
                id="closing_day"
                type="number"
                min="1"
                max="31"
                value={formData.closing_day}
                onChange={(e) =>
                  setFormData({ ...formData, closing_day: parseInt(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day">Dia de Vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) =>
                  setFormData({ ...formData, due_day: parseInt(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_limit">Limite (Opcional)</Label>
            <DecimalInput
              id="credit_limit"
              placeholder="0,00"
              value={formData.credit_limit ?? null}
              onValueChange={(num) => setFormData({ ...formData, credit_limit: num ?? undefined })}
              allowNegative={false}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
