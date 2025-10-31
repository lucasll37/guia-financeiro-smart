import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCasaRevenueSplit } from "@/hooks/useCasaRevenueSplit";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CasaRevenueSplitManagerProps {
  accountId: string;
  periodStart?: string; // Período para editar (default: mês atual)
}

export function CasaRevenueSplitManager({ accountId, periodStart }: CasaRevenueSplitManagerProps) {
  const currentPeriod = periodStart || new Date().toISOString().slice(0, 7) + "-01";
  const { account, members } = useCasaRevenueSplit(accountId, currentPeriod);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});

  // Atualizar pesos quando o período ou membros mudarem
  useEffect(() => {
    if (members.length > 0) {
      const currentWeights: Record<string, number> = {};
      members.forEach((m) => {
        currentWeights[m.user_id] = m.weight;
      });
      setWeights(currentWeights);
    }
  }, [members, currentPeriod]);

  // Calcular totais e percentuais
  const totalWeight = useMemo(() => {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    // Garantir que sempre há um peso mínimo
    return Math.max(0.01, total);
  }, [weights]);

  const percentages = useMemo(() => {
    return Object.fromEntries(
      Object.entries(weights).map(([userId, weight]) => {
        const percentage = (weight / totalWeight) * 100;
        // Validar que o percentual é um número válido
        return [userId, isFinite(percentage) ? percentage : 0];
      })
    );
  }, [weights, totalWeight]);

  const handleOpen = () => {
    // Inicializar pesos com valores atuais
    const currentWeights: Record<string, number> = {};
    members.forEach((m) => {
      currentWeights[m.user_id] = m.weight;
    });
    setWeights(currentWeights);
    setOpen(true);
  };

  const handleWeightChange = (userId: string, value: number) => {
    // Validar input: prevenir NaN, Infinity e valores negativos
    if (!isFinite(value) || isNaN(value) || value < 0) {
      return;
    }
    
    setWeights(prev => ({
      ...prev,
      [userId]: Math.max(0, Math.min(1000, value)) // Limitar entre 0 e 1000
    }));
  };

  const handlePercentageChange = (userId: string, percentage: number) => {
    // Validar input: prevenir valores inválidos
    if (!isFinite(percentage) || isNaN(percentage)) {
      return;
    }
    
    // Limitar percentual entre 0 e 99.9 para evitar divisão por zero
    const safePercentage = Math.max(0, Math.min(99.9, percentage));
    
    // Calcular o peso baseado no percentual desejado
    const otherUsersWeight = Object.entries(weights)
      .filter(([id]) => id !== userId)
      .reduce((sum, [, w]) => sum + w, 0);
    
    // Prevenir divisão por zero
    if (safePercentage >= 99.9) {
      // Se o usuário quer quase 100%, dar peso muito maior que os outros
      const maxWeight = Math.max(1, otherUsersWeight * 100);
      setWeights(prev => ({
        ...prev,
        [userId]: maxWeight
      }));
      return;
    }
    
    const newWeight = otherUsersWeight > 0 
      ? (safePercentage * otherUsersWeight) / (100 - safePercentage)
      : safePercentage / 10; // Valor padrão se não houver outros pesos
    
    // Validar que o resultado é um número válido
    if (!isFinite(newWeight) || isNaN(newWeight)) {
      return;
    }
    
    setWeights(prev => ({
      ...prev,
      [userId]: Math.max(0.1, Math.min(1000, newWeight))
    }));
  };

  const handleSave = async () => {
    try {
      // Atualizar pesos na tabela casa_revenue_splits
      const updates = Object.entries(weights).map(([userId, weight]) => ({
        account_id: accountId,
        user_id: userId,
        period_start: currentPeriod,
        weight: weight,
      }));

      // Usar upsert para inserir ou atualizar
      const { error } = await supabase
        .from("casa_revenue_splits")
        .upsert(updates, {
          onConflict: "account_id,user_id,period_start",
        });

      if (error) throw error;

      toast({
        title: "Rateio atualizado",
        description: "Os pesos de contribuição foram atualizados com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["account", accountId] });
      queryClient.invalidateQueries({ queryKey: ["casa-members", accountId] });
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar rateio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!account || account.type !== "casa") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Settings className="h-4 w-4 mr-2" />
          Configurar Rateio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Configurar Rateio de Receitas
          </DialogTitle>
          <DialogDescription>
            Defina a contribuição de cada membro para <strong>{new Date(currentPeriod + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>. 
            O valor será calculado proporcionalmente para cobrir todas as despesas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Visualização gráfica do rateio */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Distribuição Visual</h4>
            <div className="flex gap-1 h-8 rounded-md overflow-hidden border">
              {members.map((member, index) => {
                const percentage = percentages[member.user_id] || 0;
                const colors = [
                  'bg-blue-500',
                  'bg-green-500', 
                  'bg-purple-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-cyan-500'
                ];
                const color = colors[index % colors.length];
                
                return percentage > 0 ? (
                  <div
                    key={member.user_id}
                    className={cn("relative transition-all duration-300 flex items-center justify-center", color)}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage >= 15 && (
                      <span className="text-xs font-semibold text-white">
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Controles de ajuste individual */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Ajuste Individual</h4>
            {members.map((member, index) => {
              const percentage = percentages[member.user_id] || 0;
              const weight = weights[member.user_id] || 1;
              const colors = [
                'border-blue-500',
                'border-green-500',
                'border-purple-500',
                'border-orange-500',
                'border-pink-500',
                'border-cyan-500'
              ];
              const borderColor = colors[index % colors.length];

              return (
                <div key={member.user_id} className={cn("space-y-2 p-3 rounded-lg border-2", borderColor)}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {member.name}
                      {member.email && <span className="text-muted-foreground text-xs ml-1">({member.email})</span>}
                    </Label>
                    <span className="text-xl font-bold text-primary">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Slider visual */}
                  <div className="space-y-1">
                    <Slider
                      value={[percentage]}
                      onValueChange={([value]) => handlePercentageChange(member.user_id, value)}
                      max={100}
                      step={0.1}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Input manual do peso */}
                  <div className="flex items-center gap-2 text-xs">
                    <Label htmlFor={`weight-${member.user_id}`} className="whitespace-nowrap">
                      Peso:
                    </Label>
                    <Input
                      id={`weight-${member.user_id}`}
                      type="text"
                      inputMode="decimal"
                      value={isFinite(weight) ? weight.toFixed(1) : "1.0"}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d.,-]/g, "");
                        value = value.replace(",", ".");
                        const parts = value.split(".");
                        if (parts.length > 2) {
                          value = parts[0] + "." + parts.slice(1).join("");
                        }
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                          handleWeightChange(member.user_id, numValue);
                        }
                      }}
                      className="w-20 h-7 text-xs"
                    />
                    <span className="text-muted-foreground">
                      de {totalWeight.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Rateio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
