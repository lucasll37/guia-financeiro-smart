import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: GoalInsert) => void;
  goal?: Goal | null;
  accountId: string;
}

export function GoalDialog({ open, onOpenChange, onSave, goal, accountId }: GoalDialogProps) {
  const [formData, setFormData] = useState<GoalInsert>({
    account_id: accountId,
    name: "",
    target_amount: 0,
    current_amount: 0,
    deadline: null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (goal) {
      setFormData({
        account_id: goal.account_id,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        deadline: goal.deadline,
      });
    } else {
      setFormData({
        account_id: accountId,
        name: "",
        target_amount: 0,
        current_amount: 0,
        deadline: null,
      });
    }
    setErrors({});
  }, [goal, accountId, open]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (formData.target_amount <= 0) {
      newErrors.target = "Valor alvo deve ser maior que zero";
    }

    if (formData.current_amount < 0) {
      newErrors.current = "Valor atual não pode ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Viagem de férias"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Valor Alvo (R$) *</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={formData.target_amount}
                onChange={(e) =>
                  setFormData({ ...formData, target_amount: Number(e.target.value) })
                }
              />
              {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="current">Valor Atual (R$)</Label>
              <Input
                id="current"
                type="number"
                step="0.01"
                value={formData.current_amount}
                onChange={(e) =>
                  setFormData({ ...formData, current_amount: Number(e.target.value) })
                }
              />
              {errors.current && <p className="text-sm text-destructive">{errors.current}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo (Opcional)</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline || ""}
              onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value || null })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>{goal ? "Salvar" : "Criar Meta"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
