import { useState } from "react";
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
}

export function CasaRevenueSplitManager({ accountId }: CasaRevenueSplitManagerProps) {
  const { account, members } = useCasaRevenueSplit(accountId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});

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
      const { error } = await supabase
        .from("accounts")
        .update({ revenue_split: weights })
        .eq("id", accountId);

      if (error) throw error;

      toast({
        title: "Rateio atualizado",
        description: "Os pesos de contribuição foram atualizados com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["account", accountId] });
      queryClient.invalidateQueries({ queryKey: ["casa-members", accountId] });
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
            Defina os pesos de contribuição de cada membro. O valor previsto de cada um será calculado proporcionalmente para cobrir todas as despesas.
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
