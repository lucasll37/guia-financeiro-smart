import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: CategoryInsert) => void;
  category?: Category | null;
  accountId: string;
  parentId?: string | null;
  categories: Category[];
  accountType?: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  category,
  accountId,
  parentId,
  categories,
  accountType,
}: CategoryDialogProps) {
  const [formData, setFormData] = useState<CategoryInsert>({
    account_id: accountId,
    name: "",
    type: "despesa",
    color: "#6366f1",
    parent_id: parentId || null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Verifica se é categoria gerada pelo sistema (não pode ser editada)
  const isSystemGenerated = category?.is_system_generated || false;
  
  // Verifica se é conta tipo casa tentando criar/editar receita
  const isCasaRevenueRestricted = (accountType === "casa" && formData.type === "receita") || isSystemGenerated;

  useEffect(() => {
    if (category) {
      setFormData({
        account_id: category.account_id,
        name: category.name,
        type: category.type,
        color: category.color,
        parent_id: category.parent_id,
      });
    } else {
      setFormData({
        account_id: accountId,
        name: "",
        type: "despesa",
        color: "#6366f1",
        parent_id: parentId || null,
      });
    }
    setErrors({});
  }, [category, accountId, parentId, open]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    // Check for cycles
    if (formData.parent_id && category) {
      const wouldCreateCycle = checkForCycle(
        formData.parent_id,
        category.id,
        categories
      );
      if (wouldCreateCycle) {
        newErrors.parent = "Esta seleção criaria um ciclo na hierarquia";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForCycle = (
    parentId: string,
    categoryId: string,
    allCategories: Category[]
  ): boolean => {
    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) return true;
      if (visited.has(currentId)) return true;
      
      visited.add(currentId);
      const parent = allCategories.find((c) => c.id === currentId);
      currentId = parent?.parent_id || null;
    }

    return false;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSave(formData);
  };

  const availableParents = categories.filter(
    (c) => c.id !== category?.id && c.type === formData.type
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isCasaRevenueRestricted && (
            <div className="p-3 border border-amber-500/50 bg-amber-500/10 rounded-md">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Atenção:</strong> {isSystemGenerated 
                  ? "Esta categoria foi criada automaticamente pelo sistema e não pode ser editada."
                  : "Em contas tipo Casa, as subcategorias de receita são criadas automaticamente baseadas nos membros da conta e não podem ser editadas manualmente."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Alimentação"
              disabled={isCasaRevenueRestricted}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) =>
                setFormData({ ...formData, type: value })
              }
              disabled={!!category || (accountType === "casa" && formData.type === "receita")}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
            {category && (
              <p className="text-xs text-muted-foreground">
                O tipo não pode ser alterado após a criação
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Categoria Pai (Opcional)</Label>
            <Select
              value={formData.parent_id || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  parent_id: value === "none" ? null : value,
                })
              }
              disabled={isCasaRevenueRestricted}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="Sem categoria pai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria pai</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parent && (
              <p className="text-sm text-destructive">{errors.parent}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    formData.color === color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  disabled={isCasaRevenueRestricted}
                />
              ))}
            </div>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10"
              disabled={isCasaRevenueRestricted}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isCasaRevenueRestricted}>
            {category ? "Salvar" : "Criar Categoria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
