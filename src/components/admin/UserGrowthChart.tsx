import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function UserGrowthChart() {
  const [days, setDays] = useState(30);

  const { data: userData, isLoading } = useQuery({
    queryKey: ["admin-user-growth", days],
    queryFn: async () => {
      // Get user registrations for the selected period
      const daysAgo = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date and count registrations
      const dateMap = new Map<string, number>();
      
      // Initialize all dates with 0
      const daysInterval = eachDayOfInterval({ start: daysAgo, end: new Date() });
      daysInterval.forEach(day => {
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
    <Card className="overflow-hidden border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-background pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Evolução de Usuários
            </CardTitle>
            <CardDescription className="text-base">
              <span className="font-semibold text-foreground">{totalUsers}</span> usuários totais
              {newUsersToday > 0 && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  +{newUsersToday} hoje
                </span>
              )}
            </CardDescription>
          </div>
          <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="w-[140px] border-primary/20 hover:border-primary/40 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="15">15 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={userData}>
            <defs>
              <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted/30" 
              vertical={false}
            />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              dy={10}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--primary)/0.2)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              labelStyle={{ 
                color: "hsl(var(--foreground))",
                fontWeight: 600,
                marginBottom: "4px"
              }}
              itemStyle={{ 
                color: "hsl(var(--primary))",
                fontSize: "14px"
              }}
            />
            <Area
              type="monotone"
              dataKey="usuarios"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorUsuarios)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "white", strokeWidth: 2 }}
              animationDuration={1000}
              animationBegin={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
