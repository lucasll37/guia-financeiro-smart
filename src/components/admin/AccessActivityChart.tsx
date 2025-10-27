import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function AccessActivityChart() {
  const [days, setDays] = useState(30);

  const { data: accessData, isLoading } = useQuery({
    queryKey: ["admin-access-activity", days],
    queryFn: async () => {
      // Get user last access times (updated_at in profiles) for the selected period
      const daysAgo = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("updated_at")
        .gte("updated_at", daysAgo.toISOString())
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // Group by date and count accesses
      const dateMap = new Map<string, number>();
      
      // Initialize all dates with 0
      const daysInterval = eachDayOfInterval({ start: daysAgo, end: new Date() });
      daysInterval.forEach(day => {
        dateMap.set(format(day, "yyyy-MM-dd"), 0);
      });

      // Count accesses per day
      data?.forEach(profile => {
        if (profile.updated_at) {
          const date = format(new Date(profile.updated_at), "yyyy-MM-dd");
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      });

      // Convert to chart data
      const chartData = Array.from(dateMap.entries()).map(([date, count]) => ({
        date: format(new Date(date), "dd/MMM", { locale: ptBR }),
        acessos: count,
      }));

      return chartData;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Acessos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const totalAccesses = accessData?.reduce((sum, day) => sum + day.acessos, 0) || 0;
  const avgDailyAccesses = Math.round(totalAccesses / (accessData?.length || 1));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Evolução de Acessos
            </CardTitle>
            <CardDescription>
              Últimos {days} dias • Total: {totalAccesses} acessos • Média diária: {avgDailyAccesses}
            </CardDescription>
          </div>
          <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="w-[140px]">
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
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={accessData}>
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
            <Legend />
            <Bar
              dataKey="acessos"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              name="Acessos"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
