import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

export function UserGrowthChart() {
  const { data: userData, isLoading } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: async () => {
      // Get user registrations for the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date and count registrations
      const dateMap = new Map<string, number>();
      
      // Initialize all dates with 0
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
      days.forEach(day => {
        dateMap.set(format(day, "yyyy-MM-dd"), 0);
      });

      // Count registrations per day
      data?.forEach(profile => {
        const date = format(new Date(profile.created_at || ""), "yyyy-MM-dd");
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

      // Convert to cumulative growth
      let cumulative = 0;
      const chartData = Array.from(dateMap.entries()).map(([date, count]) => {
        cumulative += count;
        return {
          date: format(new Date(date), "dd/MMM", { locale: ptBR }),
          usuarios: cumulative,
          novos: count,
        };
      });

      return chartData;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const totalUsers = userData?.[userData.length - 1]?.usuarios || 0;
  const newUsersToday = userData?.[userData.length - 1]?.novos || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução de Usuários
        </CardTitle>
        <CardDescription>
          Últimos 30 dias • Total: {totalUsers} usuários • Hoje: +{newUsersToday}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={userData}>
            <defs>
              <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="usuarios"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorUsuarios)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
