import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Edit, Trash2, Calendar, TrendingUp } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, amount: number) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onUpdateProgress }: GoalCardProps) {
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
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">
              {formatCurrency(Number(goal.current_amount))}
            </span>
            <span className="text-sm text-muted-foreground">
              de {formatCurrency(Number(goal.target_amount))}
            </span>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className={getStatusColor()}>
              {isComplete ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Meta atingida!
                </span>
              ) : (
                `${percentage.toFixed(1)}%`
              )}
            </span>
            <span className="text-muted-foreground">
              Faltam {formatCurrency(Number(goal.target_amount) - Number(goal.current_amount))}
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
