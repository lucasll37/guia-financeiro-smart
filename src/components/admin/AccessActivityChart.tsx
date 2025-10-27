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
    <Card className="overflow-hidden border-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-background pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              Evolução de Acessos
            </CardTitle>
            <CardDescription className="text-base">
              <span className="font-semibold text-foreground">{totalAccesses}</span> acessos totais
              <span className="ml-2 text-muted-foreground">
                • {avgDailyAccesses}/dia
              </span>
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
          <BarChart data={accessData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
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
              cursor={{ fill: "hsl(var(--primary)/0.1)" }}
            />
            <Bar
              dataKey="acessos"
              fill="url(#barGradient)"
              radius={[6, 6, 0, 0]}
              name="Acessos"
              maxBarSize={60}
              animationDuration={1000}
              animationBegin={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
