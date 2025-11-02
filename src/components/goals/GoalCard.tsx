import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Edit, Trash2, Calendar, TrendingUp, Users, Share2 } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMaskValues } from "@/hooks/useMaskValues";
import { useGoalMembers } from "@/hooks/useGoalMembers";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onUpdateProgress: (id: string, amount: number) => void;
  onManageMembers: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onUpdateProgress, onManageMembers }: GoalCardProps) {
  const { maskValue } = useMaskValues();
  const { members } = useGoalMembers(goal.id);
  const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
  const isComplete = percentage >= 100;
  const isOverdue = goal.deadline ? isPast(new Date(goal.deadline)) && !isComplete : false;
  const daysRemaining = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getStatusColor = () => {
    if (isComplete) return "text-green-600";
    if (isOverdue) return "text-destructive";
    if (daysRemaining !== null && daysRemaining < 30) return "text-orange-600";
    return "text-muted-foreground";
  };

  return (
    <Card className={isOverdue ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{goal.name}</CardTitle>
            {members.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {members.length}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onManageMembers(goal)}
              title="Gerenciar membros"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">
              {maskValue(formatCurrency(Number(goal.current_amount)))}
            </span>
            <span className="text-sm text-muted-foreground">
              de {maskValue(formatCurrency(Number(goal.target_amount)))}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-full bg-secondary h-2.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 100 
                  ? 'bg-gradient-to-r from-green-500 to-green-600' 
                  : 'bg-gradient-to-r from-primary to-primary/80'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className={getStatusColor()}>
              {isComplete ? (
                <span className="flex items-center gap-1 font-semibold">
                  <TrendingUp className="h-4 w-4" />
                  Meta atingida!
                </span>
              ) : (
                <span className="font-medium">{maskValue(`${percentage.toFixed(1)}%`)}</span>
              )}
            </span>
            <span className="text-muted-foreground">
              {Number(goal.target_amount) - Number(goal.current_amount) > 0 ? (
                <>Faltam {maskValue(formatCurrency(Number(goal.target_amount) - Number(goal.current_amount)))}</>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Excedeu em {maskValue(formatCurrency(Math.abs(Number(goal.target_amount) - Number(goal.current_amount))))}
                </span>
              )}
            </span>
          </div>
        </div>

        {goal.deadline && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className={getStatusColor()}>
              {isOverdue ? (
                <>Atrasado - Prazo era {format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</>
              ) : daysRemaining !== null ? (
                <>
                  {daysRemaining === 0
                    ? "Vence hoje"
                    : daysRemaining === 1
                    ? "Vence amanhã"
                    : `${daysRemaining} dias restantes`}
                  {" - "}
                  {format(new Date(goal.deadline), "dd/MM/yyyy")}
                </>
              ) : (
                format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              )}
            </span>
          </div>
        )}

        {isOverdue && (
          <Badge variant="destructive" className="w-full justify-center">
            ⚠️ Meta atrasada
          </Badge>
        )}

        {!isComplete && daysRemaining !== null && daysRemaining < 30 && daysRemaining > 0 && (
          <Badge variant="secondary" className="w-full justify-center">
            ⏰ Prazo se aproximando
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
