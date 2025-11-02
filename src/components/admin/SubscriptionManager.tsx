import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

interface UserWithSubscription {
  profile: Profile;
  subscription: Subscription | null;
}

export function SubscriptionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchEmail, setSearchEmail] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch users with subscriptions
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-subscriptions", page, itemsPerPage, searchEmail, planFilter],
    queryFn: async () => {
      // First get all profiles (without pagination for search)
      let profilesQuery = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply search filter if exists
      if (searchEmail) {
        profilesQuery = profilesQuery.or(`email.ilike.%${searchEmail}%,name.ilike.%${searchEmail}%`);
      }

      const { data: allProfiles, error: profilesError, count: totalCount } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Then get subscriptions for all users
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Combine the data
      let usersWithSubs: UserWithSubscription[] = allProfiles.map(profile => ({
        profile,
        subscription: subscriptions.find(s => s.user_id === profile.id) || null
      }));

      // Apply plan filter
      if (planFilter !== "all") {
        usersWithSubs = usersWithSubs.filter(u => (u.subscription?.plan || "free") === planFilter);
      }

      // Apply pagination to filtered results
      const total = usersWithSubs.length;
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedUsers = usersWithSubs.slice(from, to);

      return { users: paginatedUsers, total };
    },
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;

  // Update subscription mutation
  const updateSubscription = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: SubscriptionPlan }) => {
      // Fazer UPSERT para garantir que a subscription seja criada se não existir
      const { error } = await supabase
        .from("subscriptions")
        .upsert(
          { 
            user_id: userId, 
            plan: newPlan,
            status: 'active',
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'user_id'
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-subscriptions"] });
      toast({
        title: "Plano atualizado!",
        description: `Plano alterado para ${variables.newPlan === "pro" ? "Pro" : "Free"} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePromote = (userId: string) => {
    updateSubscription.mutate({ userId, newPlan: "pro" });
  };

  const handleDemote = (userId: string) => {
    updateSubscription.mutate({ userId, newPlan: "free" });
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (plan === "pro") {
      return <Badge variant="destructive">Pro</Badge>;
    }
    return <Badge variant="secondary">Free</Badge>;
  };

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Gerenciar Assinaturas</CardTitle>
        </div>
        <CardDescription>
          Promova ou rebaixe usuários entre os planos Free e Pro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros e Busca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nome ou email</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Digite para buscar..."
                    value={searchEmail}
                    onChange={(e) => {
                      setSearchEmail(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Filtrar por plano</Label>
                  <select
                    id="plan"
                    value={planFilter}
                    onChange={(e) => {
                      setPlanFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Todos os planos</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemsPerPage">Itens por página</Label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assinaturas de Usuários</CardTitle>
              <CardDescription>
                Total: {totalUsers} usuários
              </CardDescription>
            </CardHeader>
            <CardContent>

              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.profile.id}>
                    <TableCell className="font-medium">
                      {user.profile.name || "Sem nome"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.profile.email}
                    </TableCell>
                    <TableCell>
                      {getPlanBadge(user.subscription?.plan || "free")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(user.subscription?.plan === "free" || !user.subscription) && (
                          <Button
                            size="sm"
                            onClick={() => handlePromote(user.profile.id)}
                            disabled={updateSubscription.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                            {!isMobile && <span className="ml-2">Promover</span>}
                          </Button>
                        )}
                        {user.subscription?.plan === "pro" && (
                          <Button
                            size="sm"
                            onClick={() => handleDemote(user.profile.id)}
                            disabled={updateSubscription.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <ArrowDownCircle className="h-4 w-4" />
                            {!isMobile && <span className="ml-2">Rebaixar</span>}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado
              </p>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Anterior</span>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {!isMobile && <span className="mr-2">Próxima</span>}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
