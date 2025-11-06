import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, Bot, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AiTutorManager() {
  const { settings, updateSetting, isLoading } = useAppSettings();
  const [localTutorialText, setLocalTutorialText] = useState("");
  const [localEnabled, setLocalEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.ai_tutor_tutorial_text) {
      const tutorialData = typeof settings.ai_tutor_tutorial_text.value === 'string'
        ? JSON.parse(settings.ai_tutor_tutorial_text.value)
        : settings.ai_tutor_tutorial_text.value;
      setLocalTutorialText(tutorialData.text || "");
    }

    if (settings?.ai_tutor_enabled) {
      const enabledData = typeof settings.ai_tutor_enabled.value === 'string'
        ? JSON.parse(settings.ai_tutor_enabled.value)
        : settings.ai_tutor_enabled.value;
      setLocalEnabled(enabledData.enabled || false);
    }
  }, [settings]);

  const handleSaveText = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: "ai_tutor_tutorial_text",
        value: JSON.stringify({ text: localTutorialText }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setLocalEnabled(enabled);
    await updateSetting.mutateAsync({
      key: "ai_tutor_enabled",
      value: JSON.stringify({ enabled }),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const currentTutorialText = settings?.ai_tutor_tutorial_text 
    ? (typeof settings.ai_tutor_tutorial_text.value === 'string' 
        ? JSON.parse(settings.ai_tutor_tutorial_text.value).text 
        : settings.ai_tutor_tutorial_text.value.text)
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Configurações do Tutor IA
        </CardTitle>
        <CardDescription>
          Configure o texto tutorial que servirá como base de conhecimento para o Tutor IA responder perguntas e criar sugestões contextuais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            O Tutor IA utiliza o texto tutorial como contexto para:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Responder perguntas dos usuários sobre o sistema</li>
              <li>Criar popups com sugestões contextuais de ações</li>
              <li>Guiar usuários através de funcionalidades</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="ai-tutor-enabled" className="text-base">
              Habilitar Tutor IA
            </Label>
            <p className="text-sm text-muted-foreground">
              Ative ou desative o Tutor IA para todos os usuários
            </p>
          </div>
          <Switch
            id="ai-tutor-enabled"
            checked={localEnabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tutorial-text">Texto Tutorial Base</Label>
          <Textarea
            id="tutorial-text"
            value={localTutorialText}
            onChange={(e) => setLocalTutorialText(e.target.value)}
            placeholder="Digite o texto tutorial que o Tutor IA usará como base de conhecimento..."
            className="min-h-[400px] font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Forneça informações detalhadas sobre funcionalidades, processos e boas práticas do sistema.
          </p>
        </div>

        <Button 
          onClick={handleSaveText} 
          disabled={isSaving || localTutorialText === currentTutorialText}
          className="w-full"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Texto Tutorial
        </Button>
      </CardContent>
    </Card>
  );
}
