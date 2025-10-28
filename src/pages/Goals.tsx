import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/hooks/useGoals";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMaskValues } from "@/hooks/useMaskValues";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalDialog } from "@/components/goals/GoalDialog";
import { evaluateNotifications } from "@/lib/notificationEvaluator";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];

export default function Goals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const { maskValue } = useMaskValues();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const { goals, isLoading, createGoal, updateGoal, deleteGoal } =
    useGoals(selectedAccountId);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleCreateGoal = () => {
    if (!selectedAccountId) {
      toast({
        title: "Selecione uma conta",
        description: "Você precisa selecionar uma conta primeiro",
        variant: "destructive",
      });
      return;
    }
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

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;
    await deleteGoal.mutateAsync(id);
  };

  const handleUpdateProgress = async (id: string, amount: number) => {
    await updateGoal.mutateAsync({ id, current_amount: amount });
  };

  const handleEvaluateNotifications = async () => {
    if (!user) return;

    setEvaluating(true);
    try {
      const count = await evaluateNotifications({
        userId: user.id,
        accountId: selectedAccountId,
      });

      toast({
        title: "Avaliação concluída",
        description: count > 0
          ? `${count} nova(s) notificação(ões) gerada(s)`
          : "Nenhuma nova notificação",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao avaliar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEvaluateNotifications}
            disabled={evaluating || !selectedAccountId}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${evaluating ? "animate-spin" : ""}`} />
            Avaliar Alertas
          </Button>
          <Button onClick={handleCreateGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      </div>

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

      {selectedAccountId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metas Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activeGoals}</p>
                <p className="text-sm text-muted-foreground">
                  {completedGoals} concluída(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Alvo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {maskValue(new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalTarget))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Acumulado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {maskValue(new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalCurrent))}
                </p>
                <p className="text-sm text-muted-foreground">
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
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </div>
          )}
        </>
      )}

      {!selectedAccountId && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">Selecione uma conta para ver as metas</p>
        </div>
      )}

      {selectedAccountId && (
        <GoalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveGoal}
          goal={selectedGoal}
          accountId={selectedAccountId}
        />
      )}
    </div>
  );
}
