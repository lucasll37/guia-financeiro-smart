import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, FileText, TrendingUp, Target } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function GuideTextManager() {
  const { accountGuideText, investmentGuideText, goalGuideText, updateSetting, isLoading } = useAppSettings();
  const [localAccountGuide, setLocalAccountGuide] = useState(accountGuideText);
  const [localInvestmentGuide, setLocalInvestmentGuide] = useState(investmentGuideText);
  const [localGoalGuide, setLocalGoalGuide] = useState(goalGuideText);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    setLocalAccountGuide(accountGuideText);
    setLocalInvestmentGuide(investmentGuideText);
    setLocalGoalGuide(goalGuideText);
  }, [accountGuideText, investmentGuideText, goalGuideText]);

  const handleSaveAccount = async () => {
    setIsSaving(true);
    await updateSetting.mutateAsync({
      key: "account_guide_text",
      value: localAccountGuide,
    });
    setIsSaving(false);
  };

  const handleSaveInvestment = async () => {
    setIsSaving(true);
    await updateSetting.mutateAsync({
      key: "investment_guide_text",
      value: localInvestmentGuide,
    });
    setIsSaving(false);
  };

  const handleSaveGoal = async () => {
    setIsSaving(true);
    await updateSetting.mutateAsync({
      key: "goal_guide_text",
      value: localGoalGuide,
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
        <CardTitle>Textos dos Guias de Ajuda</CardTitle>
        <CardDescription>
          Configure os textos dos guias que aparecem nas páginas de Conta, Investimento e Meta. Use Markdown para formatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conta
            </TabsTrigger>
            <TabsTrigger value="investment" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Investimento
            </TabsTrigger>
            <TabsTrigger value="goal" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Meta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-guide">Texto do Guia (Markdown)</Label>
                <Textarea
                  id="account-guide"
                  value={localAccountGuide}
                  onChange={(e) => setLocalAccountGuide(e.target.value)}
                  placeholder="Digite o texto do guia em Markdown..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button 
                  onClick={handleSaveAccount} 
                  disabled={isSaving || localAccountGuide === accountGuideText}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Guia de Conta
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="border rounded-md p-4 min-h-[300px] bg-muted/30 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{localAccountGuide}</ReactMarkdown>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="investment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investment-guide">Texto do Guia (Markdown)</Label>
                <Textarea
                  id="investment-guide"
                  value={localInvestmentGuide}
                  onChange={(e) => setLocalInvestmentGuide(e.target.value)}
                  placeholder="Digite o texto do guia em Markdown..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button 
                  onClick={handleSaveInvestment} 
                  disabled={isSaving || localInvestmentGuide === investmentGuideText}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Guia de Investimento
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="border rounded-md p-4 min-h-[300px] bg-muted/30 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{localInvestmentGuide}</ReactMarkdown>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goal" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-guide">Texto do Guia (Markdown)</Label>
                <Textarea
                  id="goal-guide"
                  value={localGoalGuide}
                  onChange={(e) => setLocalGoalGuide(e.target.value)}
                  placeholder="Digite o texto do guia em Markdown..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button 
                  onClick={handleSaveGoal} 
                  disabled={isSaving || localGoalGuide === goalGuideText}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Guia de Meta
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="border rounded-md p-4 min-h-[300px] bg-muted/30 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{localGoalGuide}</ReactMarkdown>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
