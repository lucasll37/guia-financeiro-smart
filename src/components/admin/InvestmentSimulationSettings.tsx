import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useInvestmentSimulationSettings, SimulationConfig } from "@/hooks/useInvestmentSimulationSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";

interface ConfigEditorProps {
  title: string;
  description: string;
  config: SimulationConfig;
  onSave: (config: SimulationConfig) => void;
  hasSliderAndInput?: boolean;
}

function ConfigEditor({ title, description, config, onSave, hasSliderAndInput }: ConfigEditorProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onSave(localConfig);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div>
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${title}-min`} className="text-xs">Mínimo</Label>
          <Input
            id={`${title}-min`}
            type="number"
            value={localConfig.min}
            onChange={(e) => setLocalConfig({ ...localConfig, min: parseFloat(e.target.value) })}
            className="h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${title}-max`} className="text-xs">Máximo</Label>
          <Input
            id={`${title}-max`}
            type="number"
            value={localConfig.max}
            onChange={(e) => setLocalConfig({ ...localConfig, max: parseFloat(e.target.value) })}
            className="h-8"
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor={`${title}-default`} className="text-xs">Valor Padrão</Label>
          <Input
            id={`${title}-default`}
            type="number"
            value={localConfig.default}
            onChange={(e) => setLocalConfig({ ...localConfig, default: parseFloat(e.target.value) })}
            className="h-8"
          />
        </div>

        {hasSliderAndInput && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`${title}-slider`} className="text-xs">Máx. Slider</Label>
              <Input
                id={`${title}-slider`}
                type="number"
                value={localConfig.max_slider || 0}
                onChange={(e) => setLocalConfig({ ...localConfig, max_slider: parseFloat(e.target.value) })}
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${title}-input`} className="text-xs">Máx. Input</Label>
              <Input
                id={`${title}-input`}
                type="number"
                value={localConfig.max_input || 0}
                onChange={(e) => setLocalConfig({ ...localConfig, max_input: parseFloat(e.target.value) })}
                className="h-8"
              />
            </div>
          </>
        )}
      </div>

      <Button onClick={handleSave} size="sm" className="w-full">
        Salvar
      </Button>
    </div>
  );
}

export function InvestmentSimulationSettings() {
  const { settings, isLoading, updateSetting } = useInvestmentSimulationSettings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            <CardTitle>Configurações de Simulação de Investimento</CardTitle>
          </div>
          <CardDescription>
            Gerencie os limites e valores padrão da simulação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Erro ao carregar configurações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          <CardTitle>Configurações de Simulação de Investimento</CardTitle>
        </div>
        <CardDescription>
          Gerencie os limites e valores padrão da simulação de investimentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConfigEditor
            title="Prazo (Meses)"
            description="Configuração do prazo da simulação em meses"
            config={settings.months_config}
            onSave={(config) => updateSetting.mutate({ key: "months_config", value: config })}
          />

          <ConfigEditor
            title="Taxa de Retorno Mensal (%)"
            description="Rentabilidade esperada por mês"
            config={settings.monthly_rate_config}
            onSave={(config) => updateSetting.mutate({ key: "monthly_rate_config", value: config })}
          />

          <ConfigEditor
            title="Taxa de Inflação (%)"
            description="Inflação esperada por mês"
            config={settings.inflation_rate_config}
            onSave={(config) => updateSetting.mutate({ key: "inflation_rate_config", value: config })}
          />

          <ConfigEditor
            title="Desvio Padrão do Retorno"
            description="Variabilidade da taxa de retorno"
            config={settings.rate_std_dev_config}
            onSave={(config) => updateSetting.mutate({ key: "rate_std_dev_config", value: config })}
          />

          <ConfigEditor
            title="Desvio Padrão da Inflação"
            description="Variabilidade da taxa de inflação"
            config={settings.inflation_std_dev_config}
            onSave={(config) => updateSetting.mutate({ key: "inflation_std_dev_config", value: config })}
          />

          <ConfigEditor
            title="Aporte Mensal (R$)"
            description="Valor do aporte mensal planejado"
            config={settings.contribution_config}
            onSave={(config) => updateSetting.mutate({ key: "contribution_config", value: config })}
            hasSliderAndInput
          />
        </div>
      </CardContent>
    </Card>
  );
}
