import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { GoalMembersDialog } from "./GoalMembersDialog";
import { useGoalPermissions } from "@/hooks/useGoalPermissions";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Omit<Database["public"]["Tables"]["goals"]["Insert"], "user_id">;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: GoalInsert) => void;
  goal?: Goal | null;
}

export function GoalDialog({ open, onOpenChange, onSave, goal }: GoalDialogProps) {
  const [formData, setFormData] = useState<GoalInsert>({
    name: "",
    target_amount: 0,
    current_amount: 0,
    deadline: null,
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { isOwner } = useGoalPermissions(goal?.id);

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        deadline: goal.deadline,
      });
      setSelectedDate(goal.deadline ? new Date(goal.deadline) : undefined);
    } else {
      setFormData({
        name: "",
        target_amount: 0,
        current_amount: 0,
        deadline: null,
      });
      setSelectedDate(undefined);
    }
    setErrors({});
  }, [goal, open]);

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{goal ? "Editar Meta" : "Nova Meta"}</span>
              {goal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMembersDialog(true)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Membros
                </Button>
              )}
            </DialogTitle>
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
              <DecimalInput
                id="target"
                placeholder="0.00"
                value={formData.target_amount ?? null}
                onValueChange={(num) => setFormData({ ...formData, target_amount: num ?? 0 })}
              />
              {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="current">Valor Atual (R$)</Label>
              <DecimalInput
                id="current"
                placeholder="0.00"
                value={formData.current_amount ?? null}
                onValueChange={(num) => setFormData({ ...formData, current_amount: num ?? 0 })}
              />
              {errors.current && <p className="text-sm text-destructive">{errors.current}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prazo (Opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setFormData({ 
                      ...formData, 
                      deadline: date ? format(date, "yyyy-MM-dd") : null 
                    });
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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

    {goal && (
      <GoalMembersDialog
        goalId={goal.id}
        goalName={goal.name}
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
      />
    )}
  </>
  );
}
