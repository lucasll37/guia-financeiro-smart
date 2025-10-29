import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bug, Lightbulb, CheckCircle2, Clock, PlayCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface Feedback {
  id: string;
  user_id: string;
  type: "bug" | "suggestion";
  message: string;
  status: "pending" | "in_progress" | "resolved" | "closed";
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export function FeedbackManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"user" | "type" | "status" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ["admin-feedbacks", statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: feedbackData, error } = await query;
      if (error) throw error;

      // Buscar profiles dos usuários
      const userIds = feedbackData?.map((f) => f.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      // Combinar feedbacks com profiles
      let feedbacksWithProfiles = feedbackData?.map((feedback) => ({
        ...feedback,
        profiles: profilesData?.find((p) => p.id === feedback.user_id),
      })) || [];

      // Ordenar localmente
      feedbacksWithProfiles.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "user":
            const nameA = a.profiles?.name || "";
            const nameB = b.profiles?.name || "";
            comparison = nameA.localeCompare(nameB);
            break;
          case "type":
            comparison = a.type.localeCompare(b.type);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "date":
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      return feedbacksWithProfiles as Feedback[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("feedback")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSort = (column: "user" | "type" | "status" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (column: "user" | "type" | "status" | "date") => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", icon: Clock, variant: "secondary" as const },
      in_progress: { label: "Em Progresso", icon: PlayCircle, variant: "default" as const },
      resolved: { label: "Resolvido", icon: CheckCircle2, variant: "default" as const },
      closed: { label: "Fechado", icon: XCircle, variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    if (type === "bug") {
      return (
        <Badge variant="destructive" className="gap-1">
          <Bug className="h-3 w-3" />
          Bug
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-chart-3">
        <Lightbulb className="h-3 w-3" />
        Sugestão
      </Badge>
    );
  };

  const stats = {
    total: feedbacks?.length || 0,
    bugs: feedbacks?.filter((f) => f.type === "bug").length || 0,
    suggestions: feedbacks?.filter((f) => f.type === "suggestion").length || 0,
    pending: feedbacks?.filter((f) => f.status === "pending").length || 0,
    resolved: feedbacks?.filter((f) => f.status === "resolved").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.bugs}</div>
            <p className="text-xs text-muted-foreground">Bugs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-chart-3">{stats.suggestions}</div>
            <p className="text-xs text-muted-foreground">Sugestões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedbacks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feedbacks dos Usuários</CardTitle>
              <CardDescription>
                Gerencie bugs reportados e sugestões de melhorias
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Carregando...</p>
          ) : feedbacks && feedbacks.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("type")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        Tipo
                        {getSortIcon("type")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("user")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        Usuário
                        {getSortIcon("user")}
                      </Button>
                    </TableHead>
                    <TableHead className="max-w-md">Mensagem</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("status")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        Status
                        {getSortIcon("status")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("date")}
                        className="flex items-center p-0 h-auto font-semibold hover:bg-transparent"
                      >
                        Data
                        {getSortIcon("date")}
                      </Button>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>{getTypeBadge(feedback.type)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{feedback.profiles?.name || "Usuário"}</span>
                          <span className="text-xs text-muted-foreground">
                            {feedback.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="whitespace-normal break-words max-w-md">
                          {feedback.message}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(feedback.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={feedback.status}
                          onValueChange={(status) =>
                            updateStatus.mutate({ id: feedback.id, status })
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum feedback encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
