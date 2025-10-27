import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Gift, Users, ChevronLeft, ChevronRight, BarChart, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { z } from "zod";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { AccessActivityChart } from "@/components/admin/AccessActivityChart";
import { StatsOverview } from "@/components/admin/StatsOverview";

const couponSchema = z.object({
  code: z.string().trim().min(3, "Código deve ter no mínimo 3 caracteres").max(50, "Código muito longo"),
  discount_percent: z.number().min(1, "Desconto deve ser entre 1 e 100").max(100, "Desconto deve ser entre 1 e 100"),
  quantity: z.number().int().min(-1, "Quantidade inválida"),
  valid_until: z.string().optional(),
  noExpiry: z.boolean().optional(),
}).refine(
  (data) => data.noExpiry || (data.valid_until && data.valid_until.length > 0),
  {
    message: "Data de validade é obrigatória quando 'Sem validade' não está marcado",
    path: ["valid_until"],
  }
);

const ITEMS_PER_PAGE = 10;

interface UserFilters {
  search: string;
  plan: string;
  sortBy: "name" | "email" | "created_at" | "updated_at";
  sortOrder: "asc" | "desc";
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userFilters, setUserFilters] = useState<UserFilters>({
    search: "",
    plan: "all",
    sortBy: "created_at",
    sortOrder: "desc",
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_percent: 10,
    quantity: 1,
    valid_until: "",
    isInfinite: false,
    noExpiry: false,
  });

  // Fetch all users with profiles and subscriptions
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", page, itemsPerPage, userFilters],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("profiles")
        .select("*, subscriptions(*)", { count: "exact" });

      // Apply search filter
      if (userFilters.search) {
        query = query.or(
          `name.ilike.%${userFilters.search}%,email.ilike.%${userFilters.search}%`
        );
      }

      // Apply sorting
      query = query.order(userFilters.sortBy, { ascending: userFilters.sortOrder === "asc" });

      // Apply pagination
      query = query.range(from, to);

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      // Filter by plan if needed (client-side since subscriptions is a join)
      let filteredProfiles = profiles || [];
      if (userFilters.plan !== "all" && filteredProfiles.length > 0) {
        filteredProfiles = filteredProfiles.filter((profile) => {
          const subscription = Array.isArray(profile.subscriptions)
            ? profile.subscriptions[0]
            : profile.subscriptions;
          return subscription?.plan === userFilters.plan;
        });
      }

      return { profiles: filteredProfiles, total: count || 0 };
    },
  });

  // Fetch all coupons
  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Create coupon mutation
  const createCoupon = useMutation({
    mutationFn: async (data: typeof couponForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("coupons").insert({
        code: data.code.toUpperCase(),
        discount_percent: data.discount_percent,
        quantity: data.quantity,
        valid_until: data.noExpiry ? null : data.valid_until,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Cupom criado com sucesso!" });
      setCouponForm({ code: "", discount_percent: 10, quantity: 1, valid_until: "", isInfinite: false, noExpiry: false });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete coupon mutation
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Cupom excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation (soft delete by updating deleted_at in accounts)
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // This should trigger account deletion - implement based on your needs
      const { error } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);
      
      if (error) throw error;
      
      // You might want to implement actual account deletion logic here
      toast({
        title: "Aviso",
        description: "Funcionalidade de exclusão de conta em desenvolvimento",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setUserToDelete(null);
    },
  });

  const handleCreateCoupon = () => {
    const validation = couponSchema.safeParse(couponForm);
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
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
        sortOrder: userFilters.sortOrder === "asc" ? "desc" : "asc",
      });
    } else {
      setUserFilters({ ...userFilters, sortBy: column, sortOrder: "asc" });
    }
    setPage(1);
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Painel de Administração
        </h1>
        <p className="text-muted-foreground">Gerencie usuários e cupons promocionais</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
        </TabsList>

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
                  <Input
                    id="search"
                    placeholder="Digite para buscar..."
                    value={userFilters.search}
                    onChange={(e) => {
                      setUserFilters({ ...userFilters, search: e.target.value });
                      setPage(1);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Filtrar por plano</Label>
                  <select
                    id="plan"
                    value={userFilters.plan}
                    onChange={(e) => {
                      setUserFilters({ ...userFilters, plan: e.target.value });
                      setPage(1);
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Todos os planos</option>
                    <option value="free">Free</option>
                    <option value="plus">Plus</option>
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
              <CardTitle>Usuários Registrados</CardTitle>
              <CardDescription>
                Total: {usersData?.total || 0} usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-center py-8">Carregando...</p>
              ) : usersData?.profiles && usersData.profiles.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort("name")}
                          >
                            Nome
                            {userFilters.sortBy === "name" && (
                              userFilters.sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                              ) : (
                                <ArrowDown className="ml-2 h-4 w-4" />
                              )
                            )}
                            {userFilters.sortBy !== "name" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort("email")}
                          >
                            Email
                            {userFilters.sortBy === "email" && (
                              userFilters.sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                              ) : (
                                <ArrowDown className="ml-2 h-4 w-4" />
                              )
                            )}
                            {userFilters.sortBy !== "email" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort("created_at")}
                          >
                            Data de Inscrição
                            {userFilters.sortBy === "created_at" && (
                              userFilters.sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                              ) : (
                                <ArrowDown className="ml-2 h-4 w-4" />
                              )
                            )}
                            {userFilters.sortBy !== "created_at" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort("updated_at")}
                          >
                            Último Acesso
                            {userFilters.sortBy === "updated_at" && (
                              userFilters.sortOrder === "asc" ? (
                                <ArrowUp className="ml-2 h-4 w-4" />
                              ) : (
                                <ArrowDown className="ml-2 h-4 w-4" />
                              )
                            )}
                            {userFilters.sortBy !== "updated_at" && (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.profiles.map((profile) => {
                        const subscription = Array.isArray(profile.subscriptions)
                          ? profile.subscriptions[0]
                          : profile.subscriptions;
                        
                        return (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">
                              {profile.name || "Sem nome"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile.email || "-"}
                            </TableCell>
                            <TableCell>
                              {profile.created_at
                                ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {profile.updated_at
                                ? format(new Date(profile.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={subscription?.plan === "pro" ? "default" : "secondary"}>
                                {subscription?.plan?.toUpperCase() || "FREE"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {subscription?.created_at
                                ? format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserToDelete(profile.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm">
                        Página {page} de {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado com os filtros aplicados
                </p>
              )}
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
                  <Input
                    id="code"
                    placeholder="PROMO2024"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={couponForm.discount_percent}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_percent: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={couponForm.isInfinite ? "" : couponForm.quantity}
                    disabled={couponForm.isInfinite}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      id="isInfinite"
                      checked={couponForm.isInfinite}
                      onChange={(e) =>
                        setCouponForm({
                          ...couponForm,
                          isInfinite: e.target.checked,
                          quantity: e.target.checked ? -1 : 1,
                        })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isInfinite" className="cursor-pointer text-sm">
                      Quantidade ilimitada
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Válido até</Label>
                  <Input
                    id="valid_until"
                    type="datetime-local"
                    value={couponForm.noExpiry ? "" : couponForm.valid_until}
                    disabled={couponForm.noExpiry}
                    onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      id="noExpiry"
                      checked={couponForm.noExpiry}
                      onChange={(e) =>
                        setCouponForm({
                          ...couponForm,
                          noExpiry: e.target.checked,
                          valid_until: e.target.checked ? "" : couponForm.valid_until,
                        })
                      }
                      className="h-4 w-4"
                    />
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
              {couponsLoading ? (
                <p>Carregando...</p>
              ) : coupons && coupons.length > 0 ? (
                <Table>
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
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>{coupon.discount_percent}%</TableCell>
                        <TableCell>
                          {coupon.quantity === -1 
                            ? `${coupon.used_count}/∞` 
                            : `${coupon.used_count}/${coupon.quantity}`}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until 
                            ? format(new Date(coupon.valid_until), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "Sem validade"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.active ? "default" : "secondary"}>
                            {coupon.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCoupon.mutate(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum cupom criado ainda</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita e todos os
              dados do usuário serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser.mutate(userToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
