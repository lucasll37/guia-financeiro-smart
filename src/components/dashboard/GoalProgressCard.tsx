import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalProgressCardProps {
  goal: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
  };
}

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const navigate = useNavigate();
  const progress = goal.target_amount > 0
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  const remaining = goal.target_amount - goal.current_amount;
  
  const daysLeft = goal.deadline 
    ? differenceInDays(new Date(goal.deadline), new Date())
    : null;

  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 hover:border-primary/50" 
      onClick={() => navigate("/app/metas")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
          <CardTitle className="text-lg font-medium group-hover:text-primary transition-colors duration-300">{goal.name}</CardTitle>
        </div>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(goal.current_amount)}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-4">
          <Progress value={progress} className="h-3" />
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(goal.target_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Falta</span>
              <span className="font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(remaining)}
              </span>
            </div>
            {daysLeft !== null && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Prazo</span>
                <span className="font-medium">
                  {daysLeft > 0 ? `${daysLeft} dias` : "Vencida"}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
