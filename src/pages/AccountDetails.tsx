import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Receipt, FolderTree, CreditCard, TrendingUp, PieChart, FileText } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { Skeleton } from "@/components/ui/skeleton";

// Import existing page components (we'll refactor these into tab components)
import Dashboard from "./Dashboard";
import Transactions from "./Transactions";
import Categories from "./Categories";
import CreditCards from "./CreditCards";
import Forecasts from "./Forecasts";
import Analysis from "./Analysis";
import Reports from "./Reports";

export default function AccountDetails() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts, isLoading } = useAccounts();

  const account = accounts?.find((a) => a.id === accountId);

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

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 h-auto">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
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
          <TabsTrigger value="previsoes" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Previsões</span>
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
          <Dashboard />
        </TabsContent>

        <TabsContent value="lancamentos">
          <Transactions />
        </TabsContent>

        <TabsContent value="categorias">
          <Categories />
        </TabsContent>

        <TabsContent value="cartoes">
          <CreditCards />
        </TabsContent>

        <TabsContent value="previsoes">
          <Forecasts />
        </TabsContent>

        <TabsContent value="analise">
          <Analysis />
        </TabsContent>

        <TabsContent value="relatorios">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
