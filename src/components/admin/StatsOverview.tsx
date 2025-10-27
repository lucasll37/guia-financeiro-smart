import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Crown, TrendingUp } from "lucide-react";
import { subDays } from "date-fns";

export function StatsOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7);

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // New users last 7 days
      const { count: newUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Active users (accessed in last 7 days)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", sevenDaysAgo.toISOString());

      // Pro users
      const { count: proUsers } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan", "pro")
        .eq("status", "active");

      return {
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        activeUsers: activeUsers || 0,
        proUsers: proUsers || 0,
      };
    },
  });

  const cards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Usuários cadastrados",
    },
    {
      title: "Novos (7 dias)",
      value: stats?.newUsers || 0,
      icon: TrendingUp,
      description: "Novos cadastros",
    },
    {
      title: "Usuários Ativos",
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      description: "Ativos nos últimos 7 dias",
    },
    {
      title: "Usuários Pro",
      value: stats?.proUsers || 0,
      icon: Crown,
      description: "Assinantes Pro",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const gradients = [
          "from-blue-500/10 to-blue-500/5",
          "from-green-500/10 to-green-500/5",
          "from-purple-500/10 to-purple-500/5",
          "from-amber-500/10 to-amber-500/5",
        ];
        const iconColors = [
          "text-blue-600 dark:text-blue-400",
          "text-green-600 dark:text-green-400",
          "text-purple-600 dark:text-purple-400",
          "text-amber-600 dark:text-amber-400",
        ];
        
        return (
          <Card 
            key={card.title} 
            className="overflow-hidden border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group"
          >
            <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br ${gradients[index]} transition-all duration-300`}>
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {card.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Icon className={`h-4 w-4 ${iconColors[index]}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {card.value.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
