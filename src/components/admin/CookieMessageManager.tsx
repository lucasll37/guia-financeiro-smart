import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { CookieConsent } from "@/components/CookieConsent";

const DEFAULT_MESSAGE = `Este site utiliza cookies e armazena dados localmente para melhorar sua experiência de uso. 
Ao continuar navegando, você concorda com nossa política de privacidade e com o tratamento 
de dados conforme a LGPD (Lei Geral de Proteção de Dados). Seus dados financeiros são 
armazenados de forma segura e criptografada.`;

interface CookieSettings {
  enabled: boolean;
  message: string;
  version: number;
}

export const CookieMessageManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-cookie-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "cookie_consent_message")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Sincronizar estado local com dados da query
  useEffect(() => {
    if (settings) {
      const settingsData = settings.setting_value as unknown as CookieSettings | null;
      // Compatibilidade com dados legados: enabled padrão é true se não existir
      setEnabled(settingsData?.enabled !== undefined ? settingsData.enabled : true);
      const messageText = settingsData?.message || DEFAULT_MESSAGE;
      setMessage(messageText);
    }
  }, [settings]);

  const updateMessageMutation = useMutation({
    mutationFn: async () => {
      const settingsData = settings?.setting_value as unknown as CookieSettings | null;
      const currentVersion = settingsData?.version || 0;
      
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: "cookie_consent_message",
          setting_value: {
            enabled,
            message,
            version: currentVersion,
          },
        }, { onConflict: "setting_key" });

      if (error) throw error;
      return currentVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cookie-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cookie-consent-settings"] });
      toast({
        title: "Mensagem atualizada",
        description: "A mensagem de cookies foi atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a mensagem",
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
          setting_key: "cookie_consent_message",
          setting_value: {
            enabled,
            message,
            version: newVersion,
          },
        }, { onConflict: "setting_key" });

      if (error) throw error;
      return newVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cookie-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cookie-consent-settings"] });
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

  const settingsData = settings?.setting_value as unknown as CookieSettings | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Mensagem de Cookies e LGPD
        </CardTitle>
        <CardDescription>
          Personalize a mensagem de aviso de cookies e privacidade exibida para os usuários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="cookie-enabled" className="text-base">
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
              id="cookie-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cookie-message">Mensagem</Label>
          <Textarea
            id="cookie-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem de cookies..."
            className="min-h-[150px]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMessageMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Mensagem
          </Button>

          <Button
            variant="outline"
            onClick={handleForceShow}
            disabled={forceShowMutation.isPending}
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
        <CookieConsent 
          forceShow={true}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </Card>
  );
};
