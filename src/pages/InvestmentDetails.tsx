import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, LineChart, TrendingDown, Lightbulb, ChevronDown } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import { useInvestmentCurrentValue } from "@/hooks/useInvestmentCurrentValue";
import { useInvestmentPermissions } from "@/hooks/useInvestmentPermissions";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyReturnsTable } from "@/components/investments/MonthlyReturnsTable";
import { InvestmentCharts } from "@/components/investments/InvestmentCharts";
import { MonthlyReturnsDialog } from "@/components/investments/MonthlyReturnsDialog";
import { ProjectionTable } from "@/components/investments/ProjectionTable";
import { addMonths } from "date-fns";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, Edit, Crown } from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

export default function InvestmentDetails() {
  const { investmentId } = useParams<{ investmentId: string }>();
  const navigate = useNavigate();
  const { investments, isLoading } = useInvestments();
  const { investmentGuideText } = useAppSettings();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<MonthlyReturn | null>(null);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [projectionRate, setProjectionRate] = useState(1);
  const [projectionInflation, setProjectionInflation] = useState(0.5);
  const [projectionContribution, setProjectionContribution] = useState(0);
  const [projectionData, setProjectionData] = useState<any[]>([]);

  const investment = investments?.find((inv) => inv.id === investmentId);
  const { data: currentValue } = useInvestmentCurrentValue(investmentId || "");
  const { canEdit, role } = useInvestmentPermissions(investment);

  const {
    returns,
    isLoading: isLoadingReturns,
    createReturn,
    updateReturn,
    deleteReturn,
  } = useMonthlyReturns(investmentId);

  const monthlyReturnsByInvestment = useMemo(() => {
    if (!investment || !returns) {
      return {};
    }
    return {
      [investment.id]: returns,
    };
  }, [investment, returns]);

  const lastReturnMonth = useMemo(() => {
    const toMonthStart = (val: any) => {
      if (!val) return null;
      if (typeof val === "string") {
        const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          const [, y, mo] = m;
          return new Date(Number(y), Number(mo) - 1, 1);
        }
      }
      if (val instanceof Date) {
        return new Date(val.getFullYear(), val.getMonth(), 1);
      }
      // Fallback: try Date then normalize to first day of month
      const d = new Date(String(val));
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
      return null;
    };

    if (returns && returns.length > 0) {
      const months = returns
        .map((r) => toMonthStart(r.month))
        .filter((d): d is Date => !!d);
      const maxTs = Math.max(...months.map((d) => d.getTime()));
      return new Date(maxTs);
    }
    const init = investment ? toMonthStart(investment.initial_month) : null;
    return init || new Date();
  }, [returns, investment]);

  const handleSubmitReturn = (data: any) => {
    if (selectedReturn) {
      updateReturn.mutate(data);
    } else {
      createReturn.mutate(data);
    }
  };

  const handleEditReturn = (returnData: MonthlyReturn) => {
    setSelectedReturn(returnData);
    setReturnsDialogOpen(true);
  };

  const handleDeleteReturn = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este rendimento?")) {
      deleteReturn.mutate(id);
    }
  };

  const handleNewReturn = () => {
    setSelectedReturn(null);
    setReturnsDialogOpen(true);
  };

  // Calculate next month for new returns
  const nextReturnMonth = useMemo(() => {
    // Se não há retornos ainda, o próximo mês é o initial_month
    if (!returns || returns.length === 0) {
      return lastReturnMonth;
    }
    // Se já há retornos, adiciona 1 mês ao último
    return addMonths(lastReturnMonth, 1);
  }, [lastReturnMonth, returns]);

  const getInvestmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      renda_fixa: "Renda Fixa",
      fundo: "Fundo",
      acao: "Ação",
      outro: "Outro",
    };
    return labels[type] || type;
  };

  if (isLoading || !investments) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!investment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">Investimento não encontrado</p>
        <Button onClick={() => navigate("/app/investimentos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Investimentos
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
          onClick={() => navigate("/app/investimentos")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{investment.name}</h1>
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
                    Como usar seus investimentos
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
                <ReactMarkdown>{investmentGuideText}</ReactMarkdown>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs defaultValue="rendimentos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="rendimentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rendimentos</span>
          </TabsTrigger>
          <TabsTrigger value="projecao" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Simulação</span>
          </TabsTrigger>
          <TabsTrigger value="grafico" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Gráfico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rendimentos">
          <MonthlyReturnsTable
            returns={returns || []}
            onEdit={canEdit ? handleEditReturn : undefined}
            onDelete={canEdit ? handleDeleteReturn : undefined}
            onNew={canEdit ? handleNewReturn : undefined}
            investmentName={investment.name}
            readOnly={!canEdit}
          />
        </TabsContent>

        <TabsContent value="projecao">
          <ProjectionTable
            currentBalance={currentValue || investment.balance}
            initialMonth={returns && returns.length > 0 ? addMonths(lastReturnMonth, 1) : lastReturnMonth}
            onConfigChange={(config) => {
              setProjectionMonths(config.months);
              setProjectionRate(config.monthlyRate);
              setProjectionInflation(config.inflationRate);
              setProjectionContribution(config.monthlyContribution);
            }}
            onProjectionDataChange={setProjectionData}
          />
        </TabsContent>

        <TabsContent value="grafico">
          <InvestmentCharts
            returns={returns || []}
            initialBalance={investment.balance}
            currentBalance={currentValue || investment.balance}
            lastReturnMonth={lastReturnMonth}
            projectionConfig={{
              months: projectionMonths,
              monthlyRate: projectionRate,
              inflationRate: projectionInflation,
              monthlyContribution: projectionContribution,
            }}
            projectionData={projectionData}
          />
        </TabsContent>
      </Tabs>

      <MonthlyReturnsDialog
        open={returnsDialogOpen}
        onOpenChange={setReturnsDialogOpen}
        monthlyReturn={selectedReturn}
        investmentId={investment.id}
        onSubmit={handleSubmitReturn}
        nextMonth={nextReturnMonth}
      />
    </div>
  );
}
