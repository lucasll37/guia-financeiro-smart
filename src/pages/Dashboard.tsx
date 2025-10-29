import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "@/hooks/useAccounts";
import { useGoals } from "@/hooks/useGoals";
import { useInvestments } from "@/hooks/useInvestments";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { InvestmentCard } from "@/components/dashboard/InvestmentCard";
import { GoalProgressCard } from "@/components/dashboard/GoalProgressCard";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, Sparkles } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { investments, isLoading: investmentsLoading } = useInvestments();

  // Filter active goals (not completed)
  const activeGoals = useMemo(() => {
    return goals?.filter(
      (g) => g.current_amount < g.target_amount
    ) || [];
  }, [goals]);

  const hasAnyData = accounts?.length || investments?.length || goals?.length;
  const isLoading = accountsLoading || goalsLoading || investmentsLoading;

  // Welcome section for new users
  if (!isLoading && !hasAnyData) {
    return (
      <div className="space-y-8 pb-8 animate-fade-in">
        <div className="text-center space-y-4 pt-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Bem-vindo ao seu Dashboard! 
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece a organizar suas finanças criando sua primeira conta, investimento ou meta financeira.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto pt-8">
          <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-primary/50" onClick={() => navigate("/app/contas")}>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-950/50 transition-colors">
                <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Criar Conta</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas contas bancárias e controle seus gastos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-primary/50" onClick={() => navigate("/app/investimentos")}>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 group-hover:bg-green-200 dark:group-hover:bg-green-950/50 transition-colors">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Criar Investimento</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe seus investimentos e rendimentos
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-primary/50" onClick={() => navigate("/app/metas")}>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-950/50 transition-colors">
                <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Criar Meta</h3>
                <p className="text-sm text-muted-foreground">
                  Defina objetivos financeiros e acompanhe seu progresso
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas finanças
        </p>
      </div>

      {/* Contas */}
      <section className="animate-fade-in">
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
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={Wallet}
              title="Nenhuma conta cadastrada"
              description="Crie sua primeira conta para começar a gerenciar suas finanças"
              actionLabel="Criar Conta"
              onAction={() => navigate("/app/contas")}
            />
          </div>
        )}
      </section>

      {/* Investimentos */}
      <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xl font-semibold mb-4">Investimentos</h2>
        {investmentsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : investments && investments.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {investments.map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={TrendingUp}
              title="Nenhum investimento cadastrado"
              description="Registre seus investimentos e acompanhe a evolução do seu patrimônio"
              actionLabel="Criar Investimento"
              onAction={() => navigate("/app/investimentos")}
            />
          </div>
        )}
      </section>

      {/* Metas em Andamento */}
      <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-xl font-semibold mb-4">Metas em Andamento</h2>
        {goalsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : activeGoals.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {activeGoals.map((goal) => (
              <GoalProgressCard key={goal.id} goal={goal} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              icon={Target}
              title="Nenhuma meta em andamento"
              description="Defina metas financeiras e acompanhe seu progresso para alcançá-las"
              actionLabel="Criar Meta"
              onAction={() => navigate("/app/metas")}
            />
          </div>
        )}
      </section>
    </div>
  );
}
