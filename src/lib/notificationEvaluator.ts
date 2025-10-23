import { supabase } from "@/integrations/supabase/client";

interface EvaluationContext {
  userId: string;
  accountId?: string;
}

export async function evaluateNotifications({ userId, accountId }: EvaluationContext) {
  const notifications: Array<{
    user_id: string;
    type: "budget_alert" | "goal" | "invite" | "system" | "transaction";
    message: string;
    metadata: any;
  }> = [];

  // Check user preferences
  const prefs = localStorage.getItem(`notification_prefs_${userId}`);
  const preferences = prefs ? JSON.parse(prefs) : {
    budget_alerts: true,
    goal_alerts: true,
    variance_alerts: true,
  };

  const currentMonth = new Date().toISOString().substring(0, 7);

  try {
    // 1. Check budget overruns
    if (preferences.budget_alerts) {
      const { data: budgets } = await supabase
        .from("budgets")
        .select("*, categories(name)")
        .eq("period", currentMonth);

      if (budgets) {
        for (const budget of budgets) {
          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("account_id", budget.account_id)
            .eq("category_id", budget.category_id)
            .gte("date", `${currentMonth}-01`)
            .lte("date", `${currentMonth}-31`);

          if (transactions) {
            const spent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
            const planned = Number(budget.amount_planned);

            if (spent > planned) {
              const excess = spent - planned;
              notifications.push({
                user_id: userId,
                type: "budget_alert",
                message: `Orçamento de ${(budget.categories as any)?.name} ultrapassado em ${new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(excess)}`,
                metadata: {
                  category_id: budget.category_id,
                  planned,
                  spent,
                  excess,
                },
              });
            }
          }
        }
      }
    }

    // 2. Check overdue goals
    if (preferences.goal_alerts) {
      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .not("deadline", "is", null)
        .lt("deadline", new Date().toISOString());

      if (goals) {
        for (const goal of goals) {
          const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
          if (percentage < 100) {
            notifications.push({
              user_id: userId,
              type: "goal",
              message: `Meta "${goal.name}" está atrasada. Faltam ${new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Number(goal.target_amount) - Number(goal.current_amount))}`,
              metadata: {
                goal_id: goal.id,
                goal_name: goal.name,
                percentage,
              },
            });
          }
        }
      }
    }

    // 3. Check variance from previous month
    if (preferences.variance_alerts && accountId) {
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthStr = lastMonth.toISOString().substring(0, 7);

      const { data: currentTransactions } = await supabase
        .from("transactions")
        .select("amount, categories(type)")
        .eq("account_id", accountId)
        .gte("date", `${currentMonth}-01`)
        .lte("date", `${currentMonth}-31`);

      const { data: lastTransactions } = await supabase
        .from("transactions")
        .select("amount, categories(type)")
        .eq("account_id", accountId)
        .gte("date", `${lastMonthStr}-01`)
        .lte("date", `${lastMonthStr}-31`);

      if (currentTransactions && lastTransactions) {
        const currentExpenses = currentTransactions
          .filter((t) => (t.categories as any)?.type === "despesa")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const lastExpenses = lastTransactions
          .filter((t) => (t.categories as any)?.type === "despesa")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        if (lastExpenses > 0) {
          const variance = ((currentExpenses - lastExpenses) / lastExpenses) * 100;
          
          if (Math.abs(variance) > 20) {
            notifications.push({
              user_id: userId,
              type: "budget_alert",
              message: `Suas despesas ${variance > 0 ? "aumentaram" : "diminuíram"} ${Math.abs(variance).toFixed(1)}% em relação ao mês anterior`,
              metadata: {
                current: currentExpenses,
                previous: lastExpenses,
                variance,
              },
            });
          }
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      // Check for existing similar notifications in the last 24h to avoid duplicates
      const { data: recent } = await supabase
        .from("notifications")
        .select("type, metadata")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const uniqueNotifications = notifications.filter((notif) => {
        return !recent?.some(
          (r) =>
            r.type === notif.type &&
            JSON.stringify(r.metadata) === JSON.stringify(notif.metadata)
        );
      });

      if (uniqueNotifications.length > 0) {
        await supabase.from("notifications").insert(
          uniqueNotifications.map(n => ({
            ...n,
            metadata: n.metadata as any,
          }))
        );
      }
    }

    return notifications.length;
  } catch (error) {
    console.error("Error evaluating notifications:", error);
    return 0;
  }
}
