import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Receipt, FolderTree, CreditCard, TrendingUp, PieChart, FileText, Lightbulb, ChevronDown, BarChart3 } from "lucide-react";
import { AccountPeriodDetails } from "@/components/accounts/AccountPeriodDetails";
import { useAccounts } from "@/hooks/useAccounts";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppSettings } from "@/hooks/useAppSettings";
import ReactMarkdown from "react-markdown";
import { useForecasts } from "@/hooks/useForecasts";
import { startOfMonth, endOfMonth } from "date-fns";

// Import existing page components (we'll refactor these into tab components)
import Transactions from "./Transactions";
import Categories from "./Categories";
import CreditCards from "./CreditCards";
import Forecasts from "./Forecasts";
import Analysis from "./Analysis";
import Reports from "./Reports";

const accountTypeLabels: Record<string, string> = {
  pessoal: "Conta Pessoal",
  conjugal: "Conta Conjugal",
  mesada: "Conta Mesada",
  casa: "Conta Casa",
};

export default function AccountDetails() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, isLoading } = useAccounts();
  const { accountGuideText } = useAppSettings();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const account = accounts?.find((a) => a.id === accountId);
  const tabParam = searchParams.get('tab');
  
  // Check if there are forecasts for the current month
  const { forecasts } = useForecasts(accountId);
  const hasForecastsForCurrentMonth = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return false;
    
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    
    return forecasts.some(forecast => {
      const forecastDate = new Date(forecast.period_start);
      return forecastDate >= currentMonthStart && forecastDate <= currentMonthEnd;
    });
  }, [forecasts]);

  // Remove o parâmetro tab da URL ao carregar
  useEffect(() => {
    if (tabParam) {
      // Remove o parâmetro após a navegação inicial
      const timer = setTimeout(() => {
        searchParams.delete('tab');
        setSearchParams(searchParams, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tabParam]);

  if (isLoading || !accounts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">Conta não encontrada</p>
        <Button onClick={() => navigate("/app/contas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Contas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/contas")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{account.name}</h1>
          <p className="text-muted-foreground">
            {accountTypeLabels[account.type] || account.type}
            {account.is_shared && " • Compartilhada"}
          </p>
        </div>
      </div>

      <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <Card className="border border-muted bg-muted/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Como usar esta conta
                  </CardTitle>
                </div>
                <ChevronDown 
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    instructionsOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-4 pb-4 animate-accordion-down">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground font-mono text-sm leading-relaxed">
                <ReactMarkdown>{accountGuideText}</ReactMarkdown>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs defaultValue={tabParam || "visao-geral"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger 
            value="previsoes" 
            className={`flex items-center gap-2 ${!hasForecastsForCurrentMonth ? 'animate-pulse' : ''}`}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Previsões</span>
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Lançamentos</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="cartoes" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Cartões</span>
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Análise</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <AccountPeriodDetails account={account} />
        </TabsContent>

        <TabsContent value="previsoes">
          <Forecasts accountId={accountId} />
        </TabsContent>

        <TabsContent value="lancamentos">
          <Transactions accountId={accountId} />
        </TabsContent>

        <TabsContent value="categorias">
          <Categories accountId={accountId} />
        </TabsContent>

        <TabsContent value="cartoes">
          <CreditCards accountId={accountId} />
        </TabsContent>

        <TabsContent value="analise">
          <Analysis accountId={accountId} />
        </TabsContent>

        <TabsContent value="relatorios">
          <Reports accountId={accountId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
