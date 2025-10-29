import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
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

  // Fetch users with subscriptions
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-subscriptions"],
    queryFn: async () => {
      // First get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Then get subscriptions for these users
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Combine the data
      const usersWithSubs: UserWithSubscription[] = profiles.map(profile => ({
        profile,
        subscription: subscriptions.find(s => s.user_id === profile.id) || null
      }));

      return usersWithSubs;
    },
  });

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

  const filteredUsers = users?.filter(u => 
    !searchEmail || u.profile.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

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
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar por email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            {filteredUsers?.map((user) => (
              <div
                key={user.profile.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{user.profile.name || "Sem nome"}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.profile.email}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getPlanBadge(user.subscription?.plan || "free")}
                  
                  {/* Só mostrar botão de promover se o plano for free */}
                  {(user.subscription?.plan === "free" || !user.subscription) && (
                    <Button
                      size="sm"
                      onClick={() => handlePromote(user.profile.id)}
                      disabled={updateSubscription.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      {!isMobile && <span className="ml-2">Promover para Pro</span>}
                    </Button>
                  )}
                  
                  {/* Só mostrar botão de rebaixar se o plano for pro */}
                  {user.subscription?.plan === "pro" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDemote(user.profile.id)}
                      disabled={updateSubscription.isPending}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    >
                      <ArrowDownCircle className="h-4 w-4" />
                      {!isMobile && <span className="ml-2">Rebaixar para Free</span>}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário encontrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
