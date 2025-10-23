import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];

interface DashboardGoalsAlertsProps {
  goals: Goal[];
  notifications: Notification[];
}

export function DashboardGoalsAlerts({
  goals,
  notifications,
}: DashboardGoalsAlertsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const activeGoals = goals.filter((g) => {
    const current = Number(g.current_amount);
    const target = Number(g.target_amount);
    return current < target;
  });

  const recentNotifications = notifications
    .filter((n) => !n.read)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma meta ativa
            </p>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const current = Number(goal.current_amount);
                const target = Number(goal.target_amount);
                const progress = calculateProgress(current, target);

                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(current)} / {formatCurrency(target)}
                      </span>
                    </div>
                    <Progress value={progress} />
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Prazo:{" "}
                        {format(new Date(goal.deadline), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alertas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum alerta novo
            </p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <Alert key={notification.id}>
                  <AlertDescription className="text-sm">
                    {notification.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
