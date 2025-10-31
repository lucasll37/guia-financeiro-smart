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
    return Object.values(weights).reduce((sum, w) => sum + w, 0);
  }, [weights]);

  const percentages = useMemo(() => {
    if (totalWeight === 0) return {};
    return Object.fromEntries(
      Object.entries(weights).map(([userId, weight]) => [
        userId,
        (weight / totalWeight) * 100
      ])
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
    setWeights(prev => ({
      ...prev,
      [userId]: Math.max(0, value)
    }));
  };

  const handlePercentageChange = (userId: string, percentage: number) => {
    // Calcular o peso baseado no percentual desejado
    const otherUsersWeight = Object.entries(weights)
      .filter(([id]) => id !== userId)
      .reduce((sum, [, w]) => sum + w, 0);
    
    const newWeight = otherUsersWeight > 0 
      ? (percentage * otherUsersWeight) / (100 - percentage)
      : percentage;
    
    setWeights(prev => ({
      ...prev,
      [userId]: Math.max(0, newWeight)
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

        <div className="space-y-6 mt-6">
          {/* Visualização gráfica do rateio */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Distribuição Visual</h4>
            <div className="flex gap-1 h-12 rounded-lg overflow-hidden border">
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
                    {percentage >= 10 && (
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
          <div className="space-y-5">
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
                <div key={member.user_id} className={cn("space-y-3 p-4 rounded-lg border-2", borderColor)}>
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      {member.name}
                      {member.email && <span className="text-muted-foreground text-sm ml-1">({member.email})</span>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Slider visual */}
                  <div className="space-y-2">
                    <Slider
                      value={[percentage]}
                      onValueChange={([value]) => handlePercentageChange(member.user_id, value)}
                      max={100}
                      step={0.1}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Input manual do peso */}
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`weight-${member.user_id}`} className="text-sm whitespace-nowrap">
                      Peso:
                    </Label>
                    <Input
                      id={`weight-${member.user_id}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={weight.toFixed(1)}
                      onChange={(e) => handleWeightChange(member.user_id, parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      de {totalWeight.toFixed(1)} total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
