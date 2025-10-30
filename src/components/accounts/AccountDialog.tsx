import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: AccountInsert) => void;
  account?: Account | null;
  currentUserId: string;
}

export function AccountDialog({ open, onOpenChange, onSave, account, currentUserId }: AccountDialogProps) {
  const [formData, setFormData] = useState<AccountInsert>({
    owner_id: currentUserId,
    name: "",
    type: "pessoal",
    currency: "BRL",
    is_shared: false,
    default_split: [],
    closing_day: 1,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (account) {
      setFormData({
        owner_id: account.owner_id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        is_shared: account.is_shared,
        default_split: account.default_split,
        closing_day: account.closing_day || 1,
      });
    } else {
      setFormData({
        owner_id: currentUserId,
        name: "",
        type: "pessoal",
        currency: "BRL",
        is_shared: false,
        default_split: [],
        closing_day: 1,
      });
    }
    setErrors({});
  }, [account, currentUserId, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setErrors({ name: "Nome é obrigatório" });
      return;
    }

    onSave({
      ...formData,
      default_split: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Conta" : "Nova Conta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Conta Corrente Principal"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => {
                  const requiresSharing = ['conjugal', 'mesada', 'casa'].includes(value);
                  setFormData({ 
                    ...formData, 
                    type: value,
                    is_shared: requiresSharing || formData.is_shared
                  });
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="conjugal">Conjugal</SelectItem>
                  <SelectItem value="mesada">Mesada</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closing_day">Dia de Viragem (1-10)</Label>
            <Input
              id="closing_day"
              type="number"
              min={1}
              max={10}
              value={formData.closing_day || 1}
              onChange={(e) => setFormData({ ...formData, closing_day: Math.min(10, Math.max(1, Number(e.target.value))) })}
            />
            <p className="text-xs text-muted-foreground">
              Dia do mês em que o período de controle se renova (1 a 10)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_shared"
              checked={formData.is_shared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_shared: checked })}
              disabled={['conjugal', 'mesada', 'casa'].includes(formData.type)}
            />
            <Label htmlFor="is_shared">
              Conta Compartilhada
              {['conjugal', 'mesada', 'casa'].includes(formData.type) && (
                <span className="text-xs text-muted-foreground ml-2">(Obrigatório para este tipo)</span>
              )}
            </Label>
          </div>

          {formData.is_shared && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ℹ️ Após criar a conta, use o botão <strong>"Gerenciar Membros"</strong> para convidar pessoas e definir a divisão de despesas.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {account ? "Salvar" : "Criar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
