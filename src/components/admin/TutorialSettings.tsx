import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, ExternalLink } from "lucide-react";

export function TutorialSettings() {
  const { tutorialVideoUrl, updateSetting, isLoading } = useAppSettings();
  const [localUrl, setLocalUrl] = useState(tutorialVideoUrl || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSetting.mutateAsync({
      key: "tutorial_video_url",
      value: localUrl,
    });
    setIsSaving(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vídeo Tutorial</CardTitle>
        <CardDescription>
          Configure a URL do vídeo do YouTube que será exibido no tutorial.
          Use o formato de embed (ex: https://www.youtube.com/embed/VIDEO_ID)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tutorial-url">URL do Vídeo (formato embed)</Label>
          <Input
            id="tutorial-url"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/VIDEO_ID"
          />
          <p className="text-xs text-muted-foreground">
            Para obter a URL embed: Abra o vídeo no YouTube → Compartilhar → Incorporar → Copie a URL do src
          </p>
        </div>
        
        {localUrl && (
          <div className="flex items-center gap-2">
            <a
              href={localUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Visualizar vídeo <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving || localUrl === tutorialVideoUrl}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
