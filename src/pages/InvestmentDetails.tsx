import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Calendar, LineChart, TrendingDown } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import { useInvestmentCurrentValue } from "@/hooks/useInvestmentCurrentValue";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyReturnsTable } from "@/components/investments/MonthlyReturnsTable";
import { InvestmentSimulator } from "@/components/investments/InvestmentSimulator";
import { MonthlyReturnsDialog } from "@/components/investments/MonthlyReturnsDialog";
import { ProjectionTable } from "@/components/investments/ProjectionTable";
import { useState, useMemo } from "react";
import { addMonths } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

export default function InvestmentDetails() {
  const { investmentId } = useParams<{ investmentId: string }>();
  const navigate = useNavigate();
  const { investments, isLoading } = useInvestments();
  const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<MonthlyReturn | null>(null);

  const investment = investments?.find((inv) => inv.id === investmentId);
  const { data: currentValue } = useInvestmentCurrentValue(investmentId || "");

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

  const getInvestmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      renda_fixa: "Renda Fixa",
      fundo: "Fundo",
      acao: "Ação",
      outro: "Outro",
    };
    return labels[type] || type;
  };

  if (isLoading) {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{investment.name}</h1>
          <p className="text-muted-foreground">
            {getInvestmentTypeLabel(investment.type)} • Taxa: {investment.monthly_rate}% a.m.
          </p>
        </div>
      </div>

      <Tabs defaultValue="rendimentos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="rendimentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rendimentos</span>
          </TabsTrigger>
          <TabsTrigger value="projecao" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Projeção</span>
          </TabsTrigger>
          <TabsTrigger value="simulador" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Simulador</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rendimentos">
          <MonthlyReturnsTable
            returns={returns || []}
            onEdit={handleEditReturn}
            onDelete={handleDeleteReturn}
            onNew={handleNewReturn}
            investmentName={investment.name}
          />
        </TabsContent>

        <TabsContent value="projecao">
          <ProjectionTable
            currentBalance={currentValue || investment.balance}
            initialMonth={
              returns && returns.length > 0
                ? addMonths(new Date(returns[returns.length - 1].month), 1)
                : addMonths(new Date(investment.initial_month), 1)
            }
          />
        </TabsContent>

        <TabsContent value="simulador">
          <InvestmentSimulator 
            investments={[investment]} 
            monthlyReturnsByInvestment={monthlyReturnsByInvestment}
          />
        </TabsContent>
      </Tabs>

      <MonthlyReturnsDialog
        open={returnsDialogOpen}
        onOpenChange={setReturnsDialogOpen}
        monthlyReturn={selectedReturn}
        investmentId={investment.id}
        onSubmit={handleSubmitReturn}
      />
    </div>
  );
}
