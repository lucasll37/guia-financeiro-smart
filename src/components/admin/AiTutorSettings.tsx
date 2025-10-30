import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Sparkles } from "lucide-react";

export function AiTutorSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requiresPro, setRequiresPro] = useState(false);

  // Fetch current setting
  const { isLoading } = useQuery({
    queryKey: ["ai-tutor-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "ai_tutor_requires_pro")
        .single();

      if (error) throw error;
      
      const enabled = (data.setting_value as any)?.enabled || false;
      setRequiresPro(enabled);
      return enabled;
    },
  });

  // Update setting mutation
  const updateSetting = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({
          setting_value: { enabled },
        })
        .eq("setting_key", "ai_tutor_requires_pro");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tutor-settings"] });
      toast({
        title: "Configuração atualizada!",
        description: "As configurações do Tutor IA foram atualizadas com sucesso.",
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
    updateSetting.mutate(requiresPro);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <CardTitle>Configurações do Tutor IA</CardTitle>
        </div>
        <CardDescription>
          Configure quem pode acessar o Tutor IA Financeiro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="requires-pro"
              checked={requiresPro}
              onChange={(e) => setRequiresPro(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="requires-pro" className="font-normal cursor-pointer">
              Requer plano Pro para acessar o Tutor IA
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            {requiresPro 
              ? "Apenas usuários com plano Pro poderão acessar o Tutor IA"
              : "Todos os usuários podem acessar o Tutor IA gratuitamente"
            }
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}