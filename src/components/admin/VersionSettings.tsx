import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2 } from "lucide-react";

export function VersionSettings() {
  const { version, updateSetting, isLoading } = useAppSettings();
  const [localVersion, setLocalVersion] = useState(version);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSetting.mutateAsync({
      key: "software_version",
      value: localVersion,
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
        <CardTitle>Versão do Software</CardTitle>
        <CardDescription>
          Configure a versão atual do sistema que será exibida no rodapé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="version">Versão</Label>
          <Input
            id="version"
            value={localVersion}
            onChange={(e) => setLocalVersion(e.target.value)}
            placeholder="1.0.0"
          />
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || localVersion === version}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
