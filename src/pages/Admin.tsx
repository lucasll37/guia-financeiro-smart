import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Gift, Users, ChevronLeft, ChevronRight, BarChart, ArrowUpDown, ArrowUp, ArrowDown, Bell, Send, CreditCard, Settings, FileText, AlertTriangle, Loader2, Copy, MessageSquare, FolderTree, Mail, Bot } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { z } from "zod";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { AccessActivityChart } from "@/components/admin/AccessActivityChart";
import { StatsOverview } from "@/components/admin/StatsOverview";
import { PlanLimitsManager } from "@/components/admin/PlanLimitsManager";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { UserActionLogs } from "@/components/admin/UserActionLogs";
import { NotificationCreator } from "@/components/admin/NotificationCreator";
import { LogRetentionSettings } from "@/components/admin/LogRetentionSettings";
import { FeedbackManager } from "@/components/admin/FeedbackManager";
import { SeedCategoriesManager } from "@/components/admin/SeedCategoriesManager";
import { VersionSettings } from "@/components/admin/VersionSettings";
import { EmailTemplatesManager } from "@/components/admin/EmailTemplatesManager";
import { CookieMessageManager } from "@/components/admin/CookieMessageManager";
import { GeneralMessageManager } from "@/components/admin/GeneralMessageManager";
import { InvestmentSimulationSettings } from "@/components/admin/InvestmentSimulationSettings";
import { GuideTextManager } from "@/components/admin/GuideTextManager";
import { AiTutorManager } from "@/components/admin/AiTutorManager";
const couponSchema = z.object({
  code: z.string().trim().min(3, "Código deve ter no mínimo 3 caracteres").max(50, "Código muito longo"),
  discount_percent: z.number().min(1, "Desconto deve ser entre 1 e 100").max(100, "Desconto deve ser entre 1 e 100"),
  quantity: z.number().int().min(-1, "Quantidade inválida"),
  valid_until: z.string().optional(),
  noExpiry: z.boolean().optional()
}).refine(data => data.noExpiry || data.valid_until && data.valid_until.length > 0, {
  message: "Data de validade é obrigatória quando 'Sem validade' não está marcado",
  path: ["valid_until"]
});
const ITEMS_PER_PAGE = 10;
interface UserFilters {
  search: string;
  plan: string;
  sortBy: "name" | "email" | "created_at" | "updated_at";
  sortOrder: "asc" | "desc";
}
export default function Admin() {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [userFilters, setUserFilters] = useState<UserFilters>({
    search: "",
    plan: "all",
    sortBy: "created_at",
    sortOrder: "desc"
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_percent: 10,
    quantity: 1,
    valid_until: "",
    isInfinite: false,
    noExpiry: false
  });
  const [notificationForm, setNotificationForm] = useState({
    targetGroup: "all",
    type: "system" as "budget_alert" | "goal" | "invite" | "system" | "transaction",
    message: ""
  });
  const {
    data: session
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data
      } = await supabase.auth.getSession();
      return data.session;
    }
  });

  // Fetch all users with profiles and subscriptions
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError
  } = useQuery({
    queryKey: ["admin-users", page, itemsPerPage, userFilters],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      let query = supabase.from("profiles").select("*", {
        count: "exact"
      });

      // Apply search filter
      if (userFilters.search) {
        query = query.or(`name.ilike.%${userFilters.search}%,email.ilike.%${userFilters.search}%`);
      }

      // Apply sorting
      query = query.order(userFilters.sortBy, {
        ascending: userFilters.sortOrder === "asc"
      });

      // Apply pagination
      query = query.range(from, to);
      const {
        data: profiles,
        error,
        count
      } = await query;
      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      // Buscar subscriptions separadamente
      const {
        data: subscriptions,
        error: subsError
      } = await supabase.from("subscriptions").select("*");
      if (subsError) {
        console.error("Error fetching subscriptions:", subsError);
      }

      // Combinar profiles com suas subscriptions
      const profilesWithSubs = profiles?.map(profile => ({
        ...profile,
        subscriptions: subscriptions?.filter(s => s.user_id === profile.id) || []
      })) || [];

      // Filter by plan if needed (client-side since subscriptions is a join)
      let filteredProfiles = profilesWithSubs;
      if (userFilters.plan !== "all" && filteredProfiles.length > 0) {
        filteredProfiles = filteredProfiles.filter(profile => {
          const subscription = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
          return subscription?.plan === userFilters.plan;
        });
      }
      return {
        profiles: filteredProfiles,
        total: count || 0
      };
    }
  });

  // Fetch all coupons
  const {
    data: coupons,
    isLoading: couponsLoading
  } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("coupons").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    }
  });

  // Create coupon mutation
  const createCoupon = useMutation({
    mutationFn: async (data: typeof couponForm) => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const {
        error
      } = await supabase.from("coupons").insert({
        code: data.code.toUpperCase(),
        discount_percent: data.discount_percent,
        quantity: data.quantity,
        valid_until: data.noExpiry ? null : data.valid_until,
        created_by: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-coupons"]
      });
      toast({
        title: "Cupom criado com sucesso!"
      });
      setCouponForm({
        code: "",
        discount_percent: 10,
        quantity: 1,
        valid_until: "",
        isInfinite: false,
        noExpiry: false
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cupom",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete coupon mutation
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-coupons"]
      });
      toast({
        title: "Cupom excluído com sucesso!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cupom",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete user mutation - Admin only
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Não autenticado");
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userId
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-users"]
      });
      toast({
        title: "Usuário deletado",
        description: "O usuário e todos os seus dados foram removidos com sucesso."
      });
      setUserToDelete(null);
      setDeleteConfirmEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message || "Ocorreu um erro ao tentar deletar o usuário.",
        variant: "destructive"
      });
    }
  });
  const handleDeleteUser = () => {
    if (!userToDelete) return;
    if (deleteConfirmEmail !== userToDelete.email) {
      toast({
        title: "Email não corresponde",
        description: "Digite o email correto do usuário para confirmar a exclusão.",
        variant: "destructive"
      });
      return;
    }
    deleteUser.mutate(userToDelete.id);
  };

  // Send bulk notifications mutation
  const sendBulkNotifications = useMutation({
    mutationFn: async (data: typeof notificationForm) => {
      let targetUsers: string[] = [];
      if (data.targetGroup === "test") {
        // Test mode: only send to current admin user
        if (!session?.user?.id) throw new Error("Usuário não autenticado");
        targetUsers = [session.user.id];
      } else {
        // Get all profiles
        const {
          data: profiles,
          error: profilesError
        } = await supabase.from("profiles").select("id");
        if (profilesError) throw profilesError;
        if (data.targetGroup === "all") {
          targetUsers = profiles?.map(p => p.id) || [];
        } else {
          // Get subscriptions for filtering
          const {
            data: subscriptions,
            error: subsError
          } = await supabase.from("subscriptions").select("user_id, plan");
          if (subsError) throw subsError;

          // Filter by plan
          const filteredSubs = subscriptions?.filter(sub => {
            if (data.targetGroup === "free") return sub.plan === "free";
            if (data.targetGroup === "pro") return sub.plan === "pro";
            return false;
          });
          targetUsers = filteredSubs?.map(s => s.user_id) || [];
        }
      }

      // Create notifications for all target users
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        type: data.type,
        message: data.message,
        read: false
      }));
      const {
        error: insertError
      } = await supabase.from("notifications").insert(notifications);
      if (insertError) throw insertError;
      return targetUsers.length;
    },
    onSuccess: count => {
      toast({
        title: "Notificações enviadas!",
        description: `${count} usuário(s) notificado(s) com sucesso.`
      });
      setNotificationForm({
        targetGroup: "all",
        type: "system",
        message: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar notificações",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleCreateCoupon = () => {
    const validation = couponSchema.safeParse(couponForm);
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    createCoupon.mutate(couponForm);
  };
  const totalPages = Math.ceil((usersData?.total || 0) / itemsPerPage);
  const handleSort = (column: UserFilters["sortBy"]) => {
    if (userFilters.sortBy === column) {
      setUserFilters({
        ...userFilters,
        sortOrder: userFilters.sortOrder === "asc" ? "desc" : "asc"
      });
    } else {
      setUserFilters({
        ...userFilters,
        sortBy: column,
        sortOrder: "asc"
      });
    }
    setPage(1);
  };
  return <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Painel de Administração
        </h1>
        <p className="text-muted-foreground">Controle total do sistema, usuários e configurações da plataforma</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="border-b">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <BarChart className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Users className="h-4 w-4" />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <CreditCard className="h-4 w-4" />
              <span>Assinaturas</span>
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <FolderTree className="h-4 w-4" />
              <span>Categorias Seed</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Gift className="h-4 w-4" />
              <span>Cupons</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <MessageSquare className="h-4 w-4" />
              <span>Feedbacks</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Mail className="h-4 w-4" />
              <span>Emails</span>
            </TabsTrigger>
            <TabsTrigger value="ai-tutor" className="flex items-center gap-2 data-[state=active]:bg-muted">
              <Bot className="h-4 w-4" />
              <span>Tutor IA</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <StatsOverview />
          
          <div className="grid gap-6 md:grid-cols-2">
            <UserGrowthChart />
            <AccessActivityChart />
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros e Busca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar por nome ou email</Label>
                  <Input id="search" placeholder="Digite para buscar..." value={userFilters.search} onChange={e => {
                  setUserFilters({
                    ...userFilters,
                    search: e.target.value
                  });
                  setPage(1);
                }} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Filtrar por plano</Label>
                  <select id="plan" value={userFilters.plan} onChange={e => {
                  setUserFilters({
                    ...userFilters,
                    plan: e.target.value
                  });
                  setPage(1);
                }} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="all">Todos os planos</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemsPerPage">Itens por página</Label>
                  <select id="itemsPerPage" value={itemsPerPage} onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setPage(1);
                }} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
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
              <CardTitle>Usuários Registrados</CardTitle>
              <CardDescription>
                Total: {usersData?.total || 0} usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? <p className="text-center py-8">Carregando...</p> : usersError ? <div className="text-center py-8">
                  <p className="text-destructive mb-4">
                    Erro ao carregar usuários: {(usersError as Error).message}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Você precisa ter permissão de <strong>admin</strong> para visualizar usuários.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Para se tornar admin, acesse o backend e execute esta query SQL substituindo 'seu@email.com' pelo seu email:
                  </p>
                  <code className="block mt-2 p-4 bg-muted rounded text-left text-xs">
                    INSERT INTO public.user_roles (user_id, role)<br />
                    SELECT id, 'admin'::app_role<br />
                    FROM auth.users<br />
                    WHERE email = 'seu@email.com'<br />
                    ON CONFLICT (user_id, role) DO NOTHING;
                  </code>
                </div> : usersData?.profiles && usersData.profiles.length > 0 ? <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort("name")}>
                            Nome
                            {userFilters.sortBy === "name" && (userFilters.sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                            {userFilters.sortBy !== "name" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort("email")}>
                            Email
                            {userFilters.sortBy === "email" && (userFilters.sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                            {userFilters.sortBy !== "email" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort("created_at")}>
                            Data de Inscrição
                            {userFilters.sortBy === "created_at" && (userFilters.sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                            {userFilters.sortBy !== "created_at" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort("updated_at")}>
                            Último Acesso
                            {userFilters.sortBy === "updated_at" && (userFilters.sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                            {userFilters.sortBy !== "updated_at" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.profiles.map(profile => {
                    const subscription = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
                    return <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {profile.name || "Sem nome"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile.email || "-"}
                            </TableCell>
                            <TableCell>
                              {profile.created_at ? format(new Date(profile.created_at), "dd/MM/yyyy", {
                          locale: ptBR
                        }) : "-"}
                            </TableCell>
                            <TableCell>
                              {profile.updated_at ? format(new Date(profile.updated_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        }) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={subscription?.plan === "pro" ? "default" : "secondary"}>
                                {subscription?.plan?.toUpperCase() || "FREE"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {subscription?.created_at ? format(new Date(subscription.created_at), "dd/MM/yyyy", {
                          locale: ptBR
                        }) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setUserToDelete({
                          id: profile.id,
                          email: profile.email || ""
                        })}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>;
                  })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {Math.min((page - 1) * itemsPerPage + 1, usersData?.total || 0)} a{" "}
                      {Math.min(page * itemsPerPage, usersData?.total || 0)} de {usersData?.total || 0}{" "}
                      usuários
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm">
                        Página {page} de {totalPages || 1}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </> : <p className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado com os filtros aplicados
                </p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Criar Cupom Promocional
              </CardTitle>
              <CardDescription>Gere cupons de desconto para seus usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código do Cupom</Label>
                  <Input id="code" placeholder="PROMO2024" value={couponForm.code} onChange={e => setCouponForm({
                  ...couponForm,
                  code: e.target.value
                })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input id="discount" type="number" min="1" max="100" value={couponForm.discount_percent} onChange={e => setCouponForm({
                  ...couponForm,
                  discount_percent: parseInt(e.target.value) || 0
                })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input id="quantity" type="number" min="1" value={couponForm.isInfinite ? "" : couponForm.quantity} disabled={couponForm.isInfinite} onChange={e => setCouponForm({
                  ...couponForm,
                  quantity: parseInt(e.target.value) || 1
                })} />
                  <div className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" id="isInfinite" checked={couponForm.isInfinite} onChange={e => setCouponForm({
                    ...couponForm,
                    isInfinite: e.target.checked,
                    quantity: e.target.checked ? -1 : 1
                  })} className="h-4 w-4" />
                    <Label htmlFor="isInfinite" className="cursor-pointer text-sm">
                      Quantidade ilimitada
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Válido até</Label>
                  <Input id="valid_until" type="datetime-local" value={couponForm.noExpiry ? "" : couponForm.valid_until} disabled={couponForm.noExpiry} onChange={e => setCouponForm({
                  ...couponForm,
                  valid_until: e.target.value
                })} />
                  <div className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" id="noExpiry" checked={couponForm.noExpiry} onChange={e => setCouponForm({
                    ...couponForm,
                    noExpiry: e.target.checked,
                    valid_until: e.target.checked ? "" : couponForm.valid_until
                  })} className="h-4 w-4" />
                    <Label htmlFor="noExpiry" className="cursor-pointer text-sm">
                      Sem validade
                    </Label>
                  </div>
                </div>
              </div>

              <Button onClick={handleCreateCoupon} disabled={createCoupon.isPending} className="mt-4">
                {createCoupon.isPending ? "Criando..." : "Criar Cupom"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cupons Ativos</CardTitle>
              <CardDescription>Gerenciar cupons promocionais existentes</CardDescription>
            </CardHeader>
            <CardContent>
              {couponsLoading ? <p>Carregando...</p> : coupons && coupons.length > 0 ? <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Usos</TableHead>
                      <TableHead>Válido até</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map(coupon => <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>{coupon.discount_percent}%</TableCell>
                        <TableCell>
                          {coupon.quantity === -1 ? `${coupon.used_count}/∞` : `${coupon.used_count}/${coupon.quantity}`}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until ? format(new Date(coupon.valid_until), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    }) : "Sem validade"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.active ? "default" : "secondary"}>
                            {coupon.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteCoupon.mutate(coupon.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table> : <p className="text-center text-muted-foreground py-8">Nenhum cupom criado ainda</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações em Massa
              </CardTitle>
              <CardDescription>
                Envie notificações para grupos específicos de usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetGroup">Grupo Alvo</Label>
                  <select id="targetGroup" value={notificationForm.targetGroup} onChange={e => setNotificationForm({
                  ...notificationForm,
                  targetGroup: e.target.value
                })} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="test">🧪 Teste (apenas você)</option>
                    <option value="all">Todos os usuários</option>
                    <option value="free">Plano Free</option>
                    <option value="pro">Plano Pro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationType">Tipo de Notificação</Label>
                  <select id="notificationType" value={notificationForm.type} onChange={e => setNotificationForm({
                  ...notificationForm,
                  type: e.target.value as any
                })} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="system">Sistema</option>
                    <option value="budget_alert">Alerta de Orçamento</option>
                    <option value="goal">Meta</option>
                    <option value="transaction">Transação</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notificationMessage">Mensagem</Label>
                <textarea id="notificationMessage" placeholder="Digite a mensagem da notificação..." value={notificationForm.message} onChange={e => setNotificationForm({
                ...notificationForm,
                message: e.target.value
              })} className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>

              <Button onClick={() => sendBulkNotifications.mutate(notificationForm)} disabled={!notificationForm.message.trim() || sendBulkNotifications.isPending} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {sendBulkNotifications.isPending ? "Enviando..." : "Enviar Notificações"}
              </Button>
            </CardContent>
          </Card>

          <NotificationCreator />

          <Card>
            <CardHeader>
              <CardTitle>Dicas de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Notificações em massa:</strong> Envie para grupos (todos, free, pro) de uma vez</li>
                <li>• <strong>Notificações individuais:</strong> Envie mensagens personalizadas para usuários específicos</li>
                <li>• Escolha o tipo apropriado para categorizar a mensagem</li>
                <li>• Escreva mensagens claras e objetivas</li>
                <li>• As notificações aparecerão no painel de cada usuário</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Limits Tab */}
        <TabsContent value="limits" className="space-y-4">
          <PlanLimitsManager />
          <InvestmentSimulationSettings />
          <VersionSettings />
          <GuideTextManager />
          <CookieMessageManager />
          <GeneralMessageManager />
        </TabsContent>

        {/* Seed Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <SeedCategoriesManager />
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionManager />
        </TabsContent>

        {/* User Action Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <LogRetentionSettings />
          <UserActionLogs />
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <FeedbackManager />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="emails" className="space-y-4">
          <EmailTemplatesManager />
        </TabsContent>

        {/* AI Tutor Tab */}
        <TabsContent value="ai-tutor" className="space-y-4">
          <AiTutorManager />
        </TabsContent>
      </Tabs>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={open => {
      if (!open) {
        setUserToDelete(null);
        setDeleteConfirmEmail("");
      }
    }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do usuário serão permanentemente excluídos. Para confirmar, digite o email do usuário abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 p-3 rounded-md border border-destructive/30">
              <p className="text-destructive font-semibold text-sm mb-2">
                Todos os dados serão permanentemente excluídos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Todas as contas e lançamentos</li>
                <li>Categorias e subcategorias personalizadas</li>
                <li>Previsões e orçamentos</li>
                <li>Investimentos e retornos mensais</li>
                <li>Metas e configurações</li>
                <li>Dados de autenticação</li>
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {userToDelete?.email}
              </div>
              <Button variant="outline" size="icon" onClick={() => {
              if (userToDelete?.email) {
                navigator.clipboard.writeText(userToDelete.email);
                toast({
                  title: "Email copiado",
                  description: "Cole no campo abaixo para confirmar"
                });
              }
            }} title="Copiar email">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Digite o email do usuário</Label>
              <Input id="confirmEmail" type="email" value={deleteConfirmEmail} onChange={e => setDeleteConfirmEmail(e.target.value)} placeholder="Email do usuário" />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmEmail("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleteUser.isPending || deleteConfirmEmail !== userToDelete?.email} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteUser.isPending ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </> : "Excluir Usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}