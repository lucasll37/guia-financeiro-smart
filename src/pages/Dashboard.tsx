import { useMemo } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals } from "@/hooks/useGoals";
import { useInvestments } from "@/hooks/useInvestments";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { InvestmentCard } from "@/components/dashboard/InvestmentCard";
import { GoalProgressCard } from "@/components/dashboard/GoalProgressCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { investments, isLoading: investmentsLoading } = useInvestments();

  // Filter active goals (not completed)
  const activeGoals = useMemo(() => {
    return goals?.filter(
      (g) => g.current_amount < g.target_amount
    ) || [];
  }, [goals]);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas finanças
        </p>
      </div>

      {/* Contas */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Contas</h2>
        {accountsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma conta encontrada</p>
        )}
      </section>

      {/* Investimentos */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Investimentos</h2>
        {investmentsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : investments && investments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {investments.map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhum investimento encontrado</p>
        )}
      </section>

      {/* Metas em Andamento */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Metas em Andamento</h2>
        {goalsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : activeGoals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal) => (
              <GoalProgressCard key={goal.id} goal={goal} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhuma meta em andamento</p>
        )}
      </section>
    </div>
  );
}
