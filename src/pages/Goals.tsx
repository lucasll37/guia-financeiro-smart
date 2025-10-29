import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/hooks/useAuth";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useToast } from "@/hooks/use-toast";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialog } from "@/components/goals/GoalDialog";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Omit<Database["public"]["Tables"]["goals"]["Insert"], "user_id">;

export default function Goals() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { maskValue } = useMaskValues();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { goals, isLoading, createGoal, updateGoal, deleteGoal } = useGoals();

  // Detectar parâmetro ?create=true e abrir diálogo
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setDialogOpen(true);
      searchParams.delete("create");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleCreateGoal = () => {
    setSelectedGoal(null);
    setDialogOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setDialogOpen(true);
  };

  const handleSaveGoal = async (goalData: GoalInsert) => {
    if (selectedGoal) {
      await updateGoal.mutateAsync({ ...goalData, id: selectedGoal.id });
    } else {
      await createGoal.mutateAsync(goalData);
    }
    setDialogOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setDeleteConfirmName("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGoal) return;
    await deleteGoal.mutateAsync(selectedGoal.id);
    setDeleteDialogOpen(false);
    setSelectedGoal(null);
    setDeleteConfirmName("");
  };

  const handleCopyGoalName = () => {
    if (selectedGoal) {
      navigator.clipboard.writeText(selectedGoal.name);
      toast({
        title: "Nome copiado",
        description: "O nome da meta foi copiado para a área de transferência",
      });
    }
  };

  const handleUpdateProgress = async (id: string, amount: number) => {
    await updateGoal.mutateAsync({ id, current_amount: amount });
  };

  const totalGoals = goals?.length || 0;
  const completedGoals = goals?.filter(
    (g) => Number(g.current_amount) >= Number(g.target_amount)
  ).length || 0;
  const activeGoals = totalGoals - completedGoals;

  const totalTarget = goals?.reduce((sum, g) => sum + Number(g.target_amount), 0) || 0;
  const totalCurrent = goals?.reduce((sum, g) => sum + Number(g.current_amount), 0) || 0;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">
            Acompanhe suas metas financeiras
          </p>
        </div>
        <Button onClick={handleCreateGoal}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Nova Meta</span>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
                <Target className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{activeGoals}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {completedGoals} concluída(s)
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alvo</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {maskValue(new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalTarget))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {maskValue(new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalCurrent))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalTarget > 0
                    ? `${maskValue(`${((totalCurrent / totalTarget) * 100).toFixed(1)}%`)} do total`
                    : ""}
                </p>
              </CardContent>
            </Card>
          </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando metas...</p>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
              onUpdateProgress={handleUpdateProgress}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">Nenhuma meta cadastrada</p>
          <Button onClick={handleCreateGoal}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Criar Primeira Meta</span>}
          </Button>
        </div>
      )}

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveGoal}
        goal={selectedGoal}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Para confirmar, digite o nome da meta abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {selectedGoal?.name}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyGoalName}
                title="Copiar nome"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-goal-name">Digite o nome da meta</Label>
              <Input
                id="confirm-goal-name"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nome da meta"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteConfirmName !== selectedGoal?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
