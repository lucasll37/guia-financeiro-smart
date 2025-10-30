import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCasaRevenueSplit } from "@/hooks/useCasaRevenueSplit";
import { useQueryClient } from "@tanstack/react-query";

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

  const handleOpen = () => {
    // Inicializar pesos com valores atuais
    const currentWeights: Record<string, number> = {};
    members.forEach((m) => {
      currentWeights[m.user_id] = m.weight;
    });
    setWeights(currentWeights);
    setOpen(true);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Rateio de Receitas</DialogTitle>
          <DialogDescription>
            Defina os pesos de contribuição de cada membro para o período de <strong>{new Date(currentPeriod + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>. O valor previsto de cada um será calculado proporcionalmente para cobrir todas as despesas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {members.map((member) => (
            <div key={member.user_id} className="space-y-2">
              <Label htmlFor={`weight-${member.user_id}`}>
                {member.name}
                {member.email && <span className="text-muted-foreground text-sm ml-1">({member.email})</span>}
              </Label>
              <Input
                id={`weight-${member.user_id}`}
                type="number"
                min="0"
                value={weights[member.user_id] || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setWeights((prev) => ({ ...prev, [member.user_id]: value }));
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
