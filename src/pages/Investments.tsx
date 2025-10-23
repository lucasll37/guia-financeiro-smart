import { useState, useMemo } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useInvestments } from "@/hooks/useInvestments";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import { InvestmentDialog } from "@/components/investments/InvestmentDialog";
import { InvestmentTable } from "@/components/investments/InvestmentTable";
import { InvestmentSimulator } from "@/components/investments/InvestmentSimulator";
import { MonthlyReturnsDialog } from "@/components/investments/MonthlyReturnsDialog";
import { MonthlyReturnsTable } from "@/components/investments/MonthlyReturnsTable";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];
type MonthlyReturn = Database["public"]["Tables"]["investment_monthly_returns"]["Row"];

export default function Investments() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<MonthlyReturn | null>(null);
  const [selectedInvestmentForReturns, setSelectedInvestmentForReturns] = useState<Investment | null>(null);

  const { accounts } = useAccounts();
  const {
    investments,
    isLoading,
    createInvestment,
    updateInvestment,
    deleteInvestment,
  } = useInvestments(selectedAccountId || undefined);

  const {
    returns,
    isLoading: isLoadingReturns,
    createReturn,
    updateReturn,
    deleteReturn,
  } = useMonthlyReturns(selectedInvestmentForReturns?.id);

  const monthlyReturnsByInvestment = useMemo(() => {
    if (!selectedInvestmentForReturns || !returns) {
      return {};
    }
    return {
      [selectedInvestmentForReturns.id]: returns,
    };
  }, [selectedInvestmentForReturns, returns]);

  const handleSubmit = (data: any) => {
    if (selectedInvestment) {
      updateInvestment.mutate(data);
    } else {
      createInvestment.mutate(data);
    }
  };

  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este investimento?")) {
      deleteInvestment.mutate(id);
    }
  };

  const handleNewInvestment = () => {
    setSelectedInvestment(null);
    setDialogOpen(true);
  };

  const handleViewReturns = (investment: Investment) => {
    // Toggle: se clicar no mesmo investimento, fecha
    if (selectedInvestmentForReturns?.id === investment.id) {
      setSelectedInvestmentForReturns(null);
    } else {
      setSelectedInvestmentForReturns(investment);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground">
            Acompanhe sua carteira de investimentos
          </p>
        </div>
        {selectedAccountId && (
          <Button onClick={handleNewInvestment}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Investimento
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAccountId ? (
        <EmptyState
          icon={TrendingUp}
          title="Selecione uma conta"
          description="Escolha uma conta para visualizar e gerenciar seus investimentos."
        />
      ) : isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : !investments || investments.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum investimento cadastrado"
          description="Adicione seus investimentos para acompanhar a rentabilidade da sua carteira."
          actionLabel="Adicionar investimento"
          onAction={handleNewInvestment}
        />
      ) : (
        <div className="space-y-6">
          <InvestmentTable
            investments={investments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSelectForReturns={handleViewReturns}
            selectedInvestmentId={selectedInvestmentForReturns?.id}
          />
          
          {!selectedInvestmentForReturns ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">
                Selecione um investimento da tabela acima para gerenciar os rendimentos mensais
              </p>
            </div>
          ) : (
            <>
              <MonthlyReturnsTable
                returns={returns || []}
                onEdit={handleEditReturn}
                onDelete={handleDeleteReturn}
                onNew={handleNewReturn}
                investmentName={selectedInvestmentForReturns.name}
              />
              
              <InvestmentSimulator 
                investments={[selectedInvestmentForReturns]} 
                monthlyReturnsByInvestment={monthlyReturnsByInvestment}
              />
            </>
          )}
        </div>
      )}

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={selectedInvestment}
        accountId={selectedAccountId}
        onSubmit={handleSubmit}
      />

      <MonthlyReturnsDialog
        open={returnsDialogOpen}
        onOpenChange={setReturnsDialogOpen}
        monthlyReturn={selectedReturn}
        investmentId={selectedInvestmentForReturns?.id || ""}
        onSubmit={handleSubmitReturn}
      />
    </div>
  );
}
