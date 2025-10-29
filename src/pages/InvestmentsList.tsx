import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ArrowRight, Edit, Trash2, TrendingUp, Crown } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import { useAuth } from "@/hooks/useAuth";
import { useMaskValues } from "@/hooks/useMaskValues";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { InvestmentDialog } from "@/components/investments/InvestmentDialog";
import { InvestmentMembersDialog } from "@/components/investments/InvestmentMembersDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInvestmentCurrentValue } from "@/hooks/useInvestmentCurrentValue";
import { useMonthlyReturns } from "@/hooks/useMonthlyReturns";
import type { Database } from "@/integrations/supabase/types";

type Investment = Database["public"]["Tables"]["investment_assets"]["Row"];

export default function InvestmentsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { investments, isLoading, createInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const { toast } = useToast();
  const { canCreateInvestment, maxInvestments, userPlan } = usePlanLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const handleInvestmentClick = (investmentId: string) => {
    navigate(`/app/investimentos/${investmentId}`);
  };

  const handleCreateClick = async () => {
    // Check if user can create more investments
    const canCreate = await canCreateInvestment();
    
    if (!canCreate) {
      toast({
        title: "Limite atingido",
        description: `Seu plano ${userPlan === 'free' ? 'FREE' : userPlan.toUpperCase()} permite até ${maxInvestments} investimento${maxInvestments > 1 ? 's' : ''}. Faça upgrade para criar mais investimentos.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedInvestment(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedInvestment) {
      await updateInvestment.mutateAsync(data);
      toast({
        title: "Investimento atualizado",
        description: "O investimento foi atualizado com sucesso",
      });
    } else {
      await createInvestment.mutateAsync(data);
      toast({
        title: "Investimento criado",
        description: "O investimento foi criado com sucesso",
      });
    }
    setDialogOpen(false);
    setSelectedInvestment(null);
  };

  const handleEditInvestment = (e: React.MouseEvent, investment: Investment) => {
    e.stopPropagation();
    setSelectedInvestment(investment);
    setDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, investment: Investment) => {
    e.stopPropagation();
    setSelectedInvestment(investment);
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedInvestment) return;
    
    await deleteInvestment.mutateAsync(selectedInvestment.id);
    toast({
      title: "Investimento excluído",
      description: "O investimento foi excluído com sucesso",
    });
    setDeleteDialogOpen(false);
    setSelectedInvestment(null);
    setDeleteConfirmName("");
  };

  const handleCopyInvestmentName = () => {
    if (selectedInvestment) {
      navigator.clipboard.writeText(selectedInvestment.name);
      toast({
        title: "Nome copiado",
        description: "O nome do investimento foi copiado para a área de transferência",
      });
    }
  };

  const handleManageMembers = (e: React.MouseEvent, investment: Investment) => {
    e.stopPropagation();
    setSelectedInvestment(investment);
    setMembersDialogOpen(true);
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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Investimentos</h1>
          <p className="text-muted-foreground">
            Acompanhe sua carteira de investimentos
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Novo Investimento</span>}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : investments && investments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment) => {
            const isOwner = investment.owner_id === user?.id;

            return (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                isOwner={isOwner}
                onEdit={handleEditInvestment}
                onDelete={handleDeleteClick}
                onManageMembers={handleManageMembers}
                onClick={handleInvestmentClick}
                getTypeLabel={getInvestmentTypeLabel}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não possui investimentos cadastrados
            </p>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Investimento
            </Button>
          </CardContent>
        </Card>
      )}

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={selectedInvestment}
        accountId={undefined}
        onSubmit={handleSubmit}
      />

      <InvestmentMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        investment={selectedInvestment}
        ownerId={user.id}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Para confirmar, digite o nome do investimento abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {selectedInvestment?.name}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyInvestmentName}
                title="Copiar nome"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-investment-name">Digite o nome do investimento</Label>
              <Input
                id="confirm-investment-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nome do investimento"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteConfirmName !== selectedInvestment?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Investimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de Card de Investimento
interface InvestmentCardProps {
  investment: Investment;
  isOwner: boolean;
  onEdit: (e: React.MouseEvent, investment: Investment) => void;
  onDelete: (e: React.MouseEvent, investment: Investment) => void;
  onManageMembers: (e: React.MouseEvent, investment: Investment) => void;
  onClick: (investmentId: string) => void;
  getTypeLabel: (type: string) => string;
}

function InvestmentCard({
  investment,
  isOwner,
  onEdit,
  onDelete,
  onManageMembers,
  onClick,
  getTypeLabel,
}: InvestmentCardProps) {
  const { data: currentValue = 0 } = useInvestmentCurrentValue(investment.id);
  const { returns = [] } = useMonthlyReturns(investment.id);
  const { maskValue } = useMaskValues();

  // Calcular aportes nominais totais
  const totalContributions = returns.reduce((sum, r) => sum + Number(r.contribution || 0), 0);
  
  // Rendimento nominal = Valor atual - Total de aportes
  const nominalGain = currentValue - totalContributions;
  const gainPercentage = totalContributions > 0 ? (nominalGain / totalContributions) * 100 : 0;
  const isPositive = nominalGain >= 0;

  // Calcular inflação acumulada usando juros compostos
  let accumulatedInflation = 0;
  if (returns.length > 0) {
    const inflationFactor = returns.reduce((factor, r) => {
      const monthlyInflation = Number(r.inflation_rate || 0) / 100;
      return factor * (1 + monthlyInflation);
    }, 1);
    accumulatedInflation = (inflationFactor - 1) * 100;
  }

  // Calcular rendimento real (nominal - inflação)
  const inflationValue = totalContributions * (accumulatedInflation / 100);
  const realGain = nominalGain - inflationValue;
  const realGainPercentage = totalContributions > 0
    ? ((1 + gainPercentage / 100) / (1 + accumulatedInflation / 100) - 1) * 100
    : 0;
  const isRealPositive = realGain >= 0;

  // Calcular retorno real médio mensal usando juros compostos
  const numberOfMonths = returns.length;
  let monthlyAverageReturn = 0;
  if (numberOfMonths > 0 && totalContributions > 0 && realGainPercentage !== 0) {
    // (1 + retornoTotal) = (1 + retornoMensal)^N
    // retornoMensal = ((1 + retornoTotal)^(1/N)) - 1
    const totalReturnFactor = 1 + (realGainPercentage / 100);
    monthlyAverageReturn = (Math.pow(totalReturnFactor, 1 / numberOfMonths) - 1) * 100;
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(investment.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{investment.name}</CardTitle>
            <Badge variant="outline">
              {getTypeLabel(investment.type)}
            </Badge>
          </div>
          <div className="flex gap-1 shrink-0">
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onManageMembers(e, investment)}
                  title="Gerenciar Membros"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onDelete(e, investment)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onEdit(e, investment)}
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 py-4">
        {/* Valor Atual - destaque principal */}
        <div className="space-y-1 pb-3 border-b">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Valor Atual</div>
          <div className="text-2xl font-bold">
            {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(currentValue))}
          </div>
          <div className="text-xs text-muted-foreground">
            Total Investido Nominal: {maskValue(new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalContributions))}
          </div>
        </div>

        {/* Breakdown de Retornos */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Retorno Nominal</span>
            <div className={`text-right ${isPositive ? "text-green-600" : "text-red-600"}`}>
              <div className="text-base font-semibold">
                {isPositive ? "+" : ""}
                {maskValue(new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(nominalGain))}
              </div>
              <div className="text-[10px] opacity-75">
                {isPositive ? "+" : ""}{maskValue(`${gainPercentage.toFixed(1)}%`)}
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Inflação Acumulada</span>
            <div className="text-right text-orange-600">
              <div className="text-base font-semibold">
                -{maskValue(new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(inflationValue))}
              </div>
              <div className="text-[10px] opacity-75">
                -{maskValue(`${accumulatedInflation.toFixed(2)}%`)}
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 pt-2 border-t-2">
            <span className="text-sm font-semibold">Retorno Real</span>
            <div className={`text-right ${isRealPositive ? "text-green-600" : "text-red-600"}`}>
              <div className="text-xl font-bold">
                {isRealPositive ? "+" : ""}
                {maskValue(new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(realGain))}
              </div>
              <div className="text-xs font-medium opacity-90">
                {isRealPositive ? "+" : ""}{maskValue(`${realGainPercentage.toFixed(1)}%`)}
              </div>
            </div>
          </div>
        </div>

        {/* Métrica de performance */}
        <div className="pt-2 border-t">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Retorno Real Médio Mensal</span>
            <div className={`text-base font-bold ${isRealPositive ? "text-green-600" : "text-red-600"}`}>
              {numberOfMonths > 0 ? (
                <>
                  {isRealPositive ? "+" : ""}
                  {maskValue(`${monthlyAverageReturn.toFixed(2)}%`)}
                </>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        <button 
          className="w-full flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          onClick={() => onClick(investment.id)}
        >
          <span>Ver detalhes completos</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </CardContent>
    </Card>
  );
}
