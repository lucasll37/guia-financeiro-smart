import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences, Language, Currency, DateFormat } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export function UserPreferences() {
  const { preferences, updatePreferences } = useUserPreferences();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleChange = (key: string, value: string) => {
    updatePreferences({ [key]: value });
    toast({
      title: "Preferência atualizada",
      description: "Suas configurações foram salvas com sucesso",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema
          </CardTitle>
          <CardDescription>
            Escolha o tema de cores da interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Aparência</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Selecione o tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">☀️ Claro</SelectItem>
                <SelectItem value="dark">🌙 Escuro</SelectItem>
                <SelectItem value="system">💻 Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Idioma</CardTitle>
          <CardDescription>
            Selecione o idioma da interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select
              value={preferences.language}
              onValueChange={(value: Language) => handleChange("language", value)}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (United States)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moeda</CardTitle>
          <CardDescription>
            Escolha a moeda padrão para exibição de valores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda</Label>
            <Select
              value={preferences.currency}
              onValueChange={(value: Currency) => handleChange("currency", value)}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real Brasileiro (BRL)</SelectItem>
                <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato de Data</CardTitle>
          <CardDescription>
            Defina como as datas serão exibidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="dateFormat">Formato de Data</Label>
            <Select
              value={preferences.dateFormat}
              onValueChange={(value: DateFormat) => handleChange("dateFormat", value)}
            >
              <SelectTrigger id="dateFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Exibição de Valores
          </CardTitle>
          <CardDescription>
            Configure como os valores financeiros são exibidos ao fazer login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showValues">Ocultar Valores ao fazer login</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, os valores sempre aparecem mascarados ao fazer login
              </p>
            </div>
            <Switch
              id="showValues"
              checked={preferences.hideValuesOnLogin}
              onCheckedChange={(checked) => {
                updatePreferences({ hideValuesOnLogin: checked });
                
                // Disparar evento customizado para sincronizar o estado
                window.dispatchEvent(
                  new CustomEvent("preferencesChanged", {
                    detail: { hideValuesOnLogin: checked },
                  })
                );
                
                toast({
                  title: "Preferência atualizada",
                  description: "Suas configurações foram salvas com sucesso",
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
