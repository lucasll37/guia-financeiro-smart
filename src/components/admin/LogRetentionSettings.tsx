import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";

export function LogRetentionSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(30);

  // Buscar configuração atual
  const { data: settings, isLoading } = useQuery({
    queryKey: ["log-retention-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "log_retention_days")
        .single();

      if (error) throw error;
      
      if (data) {
        const retentionDays = (data.setting_value as any).days;
        setDays(retentionDays);
      }
      
      return data;
    },
  });

  // Atualizar configuração
  const updateSettings = useMutation({
    mutationFn: async (newDays: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("admin_settings")
        .update({
          setting_value: { days: newDays },
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("setting_key", "log_retention_days");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log-retention-settings"] });
      toast({
        title: "Configuração atualizada",
        description: `Logs serão mantidos por ${days} dias`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (days < 1) {
      toast({
        title: "Valor inválido",
        description: "O período de retenção deve ser maior que 0",
        variant: "destructive",
      });
      return;
    }
    
    if (days > 365) {
      toast({
        title: "Valor inválido",
        description: "O período máximo de retenção é 365 dias",
        variant: "destructive",
      });
      return;
    }

    updateSettings.mutate(days);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Retenção de Logs
        </CardTitle>
        <CardDescription>
          Configure por quantos dias os logs de ações dos usuários serão armazenados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="retentionDays">Dias de retenção</Label>
          <div className="flex gap-2">
            <Input
              id="retentionDays"
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="max-w-[200px]"
            />
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Logs mais antigos que {days} dias serão automaticamente excluídos
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">O que é registrado nos logs:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Criação de contas, lançamentos, investimentos</li>
            <li>Atualizações e exclusões de dados</li>
            <li>Criação de metas</li>
            <li>Ações de cartões de crédito</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Nota:</strong> Os logs não contêm informações sensíveis como valores ou detalhes pessoais.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
