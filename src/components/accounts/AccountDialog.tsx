import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
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

interface SplitMember {
  user_id: string;
  percent: number;
}

export function AccountDialog({ open, onOpenChange, onSave, account, currentUserId }: AccountDialogProps) {
  const [formData, setFormData] = useState<AccountInsert>({
    owner_id: currentUserId,
    name: "",
    type: "pessoal",
    currency: "BRL",
    is_shared: false,
    default_split: [],
  });

  const [splitMembers, setSplitMembers] = useState<SplitMember[]>([]);
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
      });
      
      const splits = (account.default_split as any) || [];
      setSplitMembers(splits);
    } else {
      setFormData({
        owner_id: currentUserId,
        name: "",
        type: "pessoal",
        currency: "BRL",
        is_shared: false,
        default_split: [],
      });
      setSplitMembers([]);
    }
    setErrors({});
  }, [account, currentUserId, open]);

  const validateSplit = () => {
    if (!formData.is_shared) return true;
    
    const total = splitMembers.reduce((sum, m) => sum + m.percent, 0);
    if (total !== 100) {
      setErrors({ split: "A soma dos percentuais deve ser exatamente 100%" });
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setErrors({ name: "Nome é obrigatório" });
      return;
    }

    if (!validateSplit()) return;

    onSave({
      ...formData,
      default_split: (formData.is_shared ? splitMembers : []) as any,
    });
  };

  const addSplitMember = () => {
    setSplitMembers([...splitMembers, { user_id: "", percent: 0 }]);
  };

  const removeSplitMember = (index: number) => {
    setSplitMembers(splitMembers.filter((_, i) => i !== index));
  };

  const updateSplitMember = (index: number, field: keyof SplitMember, value: any) => {
    const updated = [...splitMembers];
    updated[index] = { ...updated[index], [field]: value };
    setSplitMembers(updated);
  };

  const totalPercent = splitMembers.reduce((sum, m) => sum + m.percent, 0);

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
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="conjugal">Conjugal</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
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

          <div className="flex items-center space-x-2">
            <Switch
              id="is_shared"
              checked={formData.is_shared}
              onCheckedChange={(checked) => setFormData({ ...formData, is_shared: checked })}
            />
            <Label htmlFor="is_shared">Conta Compartilhada</Label>
          </div>

          {formData.is_shared && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Divisão Padrão de Despesas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSplitMember}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Membro
                  </Button>
                </div>

                {splitMembers.map((member, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="ID do usuário"
                        value={member.user_id}
                        onChange={(e) => updateSplitMember(index, "user_id", e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="% (0-100)"
                        value={member.percent || ""}
                        onChange={(e) => updateSplitMember(index, "percent", Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSplitMember(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center justify-between text-sm">
                  <span>Total:</span>
                  <span className={totalPercent === 100 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {totalPercent}%
                  </span>
                </div>

                {errors.split && <p className="text-sm text-destructive">{errors.split}</p>}
              </div>
            </>
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
