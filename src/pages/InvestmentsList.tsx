import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ArrowRight, Edit, Trash2, TrendingUp } from "lucide-react";
import { useInvestments } from "@/hooks/useInvestments";
import { useAuth } from "@/hooks/useAuth";
import { InvestmentDialog } from "@/components/investments/InvestmentDialog";
import { InvestmentMembersDialog } from "@/components/investments/InvestmentMembersDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  const { investments, isLoading, createInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const handleInvestmentClick = (investmentId: string) => {
    navigate(`/app/investimentos/${investmentId}`);
  };

  const handleCreateClick = () => {
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
          <Plus className="h-4 w-4 mr-2" />
          Novo Investimento
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
              Esta ação não pode ser desfeita. Todos os dados de rendimentos mensais também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

  // Calcular aportes nominais totais
  const totalContributions = returns.reduce((sum, r) => sum + Number(r.contribution || 0), 0);
  
  // Rendimento nominal = Valor atual - Total de aportes
  const nominalGain = currentValue - totalContributions;
  const gainPercentage = totalContributions > 0 ? (nominalGain / totalContributions) * 100 : 0;
  const isPositive = nominalGain >= 0;

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
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Aportes</div>
              <div className="text-sm font-semibold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalContributions)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Valor Atual</div>
              <div className="text-sm font-semibold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(currentValue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Rendimento</div>
              <div className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {isPositive ? "+" : ""}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(nominalGain)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Retorno
            </div>
            <div className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}
              {gainPercentage.toFixed(2)}%
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              Clique para ver detalhes
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
