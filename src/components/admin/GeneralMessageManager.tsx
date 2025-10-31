import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GeneralMessageModal } from "@/components/GeneralMessageModal";

interface GeneralMessageSettings {
  enabled: boolean;
  title: string;
  message: string;
  version: number;
}

export const GeneralMessageManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-general-message-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "general_message")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Sincronizar estado local com dados da query
  useEffect(() => {
    if (settings) {
      const settingsData = settings.setting_value as unknown as GeneralMessageSettings | null;
      setEnabled(settingsData?.enabled || false);
      setTitle(settingsData?.title || "");
      setMessage(settingsData?.message || "");
    }
  }, [settings]);

  const updateMessageMutation = useMutation({
    mutationFn: async () => {
      const settingsData = settings?.setting_value as unknown as GeneralMessageSettings | null;
      const currentVersion = settingsData?.version || 0;
      
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: "general_message",
          setting_value: {
            enabled,
            title,
            message,
            version: currentVersion,
          },
        }, { onConflict: "setting_key" });

      if (error) throw error;
      return currentVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-general-message-settings"] });
      queryClient.invalidateQueries({ queryKey: ["general-message-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações da mensagem geral foram atualizadas",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    },
  });

  const forceShowMutation = useMutation({
    mutationFn: async () => {
      const newVersion = Date.now();
      
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: "general_message",
          setting_value: {
            enabled,
            title,
            message,
            version: newVersion,
          },
        }, { onConflict: "setting_key" });

      if (error) throw error;
      return newVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-general-message-settings"] });
      queryClient.invalidateQueries({ queryKey: ["general-message-settings"] });
      toast({
        title: "Mensagem reativada",
        description: "A mensagem será exibida novamente para todos os usuários",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível reativar a mensagem",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMessageMutation.mutate();
  };

  const handleForceShow = () => {
    forceShowMutation.mutate();
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const settingsData = settings?.setting_value as unknown as GeneralMessageSettings | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mensagens Gerais
        </CardTitle>
        <CardDescription>
          Configure mensagens personalizadas para exibir aos usuários do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="message-enabled" className="text-base">
              Mensagem Ativa
            </Label>
            <p className="text-sm text-muted-foreground">
              Ative ou desative a exibição da mensagem para os usuários
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enabled ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              id="message-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-title">Título</Label>
          <Input
            id="message-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título da mensagem..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-content">Mensagem</Label>
          <Textarea
            id="message-content"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            className="min-h-[150px]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMessageMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>

          <Button
            variant="outline"
            onClick={handleForceShow}
            disabled={forceShowMutation.isPending || !enabled}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Forçar Exibição para Todos
          </Button>

          <Button
            variant="secondary"
            onClick={() => setShowTestModal(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Testar Localmente
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Dica:</strong> Ao clicar em "Forçar Exibição para Todos", a mensagem será exibida 
            novamente para todos os usuários, mesmo aqueles que marcaram "Não mostrar novamente".
            A mensagem só será exibida se estiver ativa.
          </AlertDescription>
        </Alert>
      </CardContent>
      
      {showTestModal && (
        <GeneralMessageModal 
          forceShow={true}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </Card>
  );
};
