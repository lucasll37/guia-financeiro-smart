import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Receipt, FolderTree, CreditCard, TrendingUp, PieChart, FileText, Lightbulb, ChevronDown, BarChart3 } from "lucide-react";
import { AccountPeriodDetails } from "@/components/accounts/AccountPeriodDetails";
import { useAccounts } from "@/hooks/useAccounts";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForecasts } from "@/hooks/useForecasts";
import { useTransactions } from "@/hooks/useTransactions";

// Import existing page components (we'll refactor these into tab components)
import Transactions from "./Transactions";
import Categories from "./Categories";
import CreditCards from "./CreditCards";
import Forecasts from "./Forecasts";
import Analysis from "./Analysis";
import Reports from "./Reports";

export default function AccountDetails() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, isLoading } = useAccounts();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const account = accounts?.find((a) => a.id === accountId);
  const tabParam = searchParams.get('tab');

  const { forecasts } = useForecasts(accountId);
  const { transactions } = useTransactions(accountId);

  const showSuggestion = useMemo(() => {
    const hasNoForecasts = !forecasts || forecasts.length === 0;
    const hasNoTransactions = !transactions || transactions.length === 0;
    return hasNoForecasts && hasNoTransactions;
  }, [forecasts, transactions]);

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

  if (isLoading) {
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
            {account.type === "pessoal" ? "Conta Pessoal" : "Conta Empresarial"}
            {account.is_shared && " • Compartilhada"}
          </p>
        </div>
      </div>

      {showSuggestion && (
        <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 animate-fade-in">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Como usar esta conta</CardTitle>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-primary transition-transform duration-200 ${
                      instructionsOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
                <CardDescription>
                  Siga estes passos para ter controle total das suas finanças
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 animate-accordion-down">
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                      1
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">Crie suas previsões</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Defina quanto espera receber e gastar em cada categoria para planejar seu período
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                      2
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">Registre seus lançamentos</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Adicione suas receitas e despesas conforme acontecem no dia a dia
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                      3
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">Acompanhe a evolução</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Veja aqui a comparação entre previsto x realizado e seu saldo do período
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      const currentUrl = window.location.pathname;
                      const baseUrl = currentUrl.split('?')[0];
                      navigate(`${baseUrl}?tab=previsoes`);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Criar Previsões
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const currentUrl = window.location.pathname;
                      const baseUrl = currentUrl.split('?')[0];
                      navigate(`${baseUrl}?tab=lancamentos`);
                    }}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Adicionar Lançamento
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Tabs defaultValue={tabParam || "visao-geral"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="previsoes" className="flex items-center gap-2">
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
