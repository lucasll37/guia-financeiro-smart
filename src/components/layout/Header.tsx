import { User, Crown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMaskValues } from "@/hooks/useMaskValues";

const routeLabels: Record<string, string> = {
  "/app/dashboard": t("nav.dashboard"),
  "/app/contas": t("nav.accounts"),
  "/app/categorias": t("nav.categories"),
  "/app/lancamentos": t("nav.transactions"),
  "/app/metas": t("nav.goals"),
  "/app/investimentos": t("nav.investments"),
  "/app/relatorios": t("nav.reports"),
  "/app/configuracoes": t("nav.settings"),
};

export const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = routeLabels[location.pathname] || "Painel";
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { isMasked, toggleMask } = useMaskValues();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, email")
        .eq("id", user.id)
        .single();
      return data as { name: string | null; avatar_url: string | null; email: string | null } | null;
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .single();
      return data as { plan: "free" | "plus" | "pro"; status: string } | null;
    },
    enabled: !!user?.id,
  });

  const plan = subscription?.plan ?? "free";
  const isPro = plan === "pro";
  const lastAccess = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Não disponível";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4">
        <SidebarTrigger />
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/app/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentRoute}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-4">
          <Button
            variant={isMasked ? "destructive" : "ghost"}
            size="icon"
            onClick={toggleMask}
            title={isMasked ? "Mostrar valores" : "Ocultar valores"}
            aria-pressed={isMasked}
          >
            {isMasked ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

          {user && (
            <>
              <NotificationPanel
                userId={user.id}
                onOpenPreferences={() => setPreferencesOpen(true)}
              />
              <NotificationPreferences
                open={preferencesOpen}
                onOpenChange={setPreferencesOpen}
                userId={user.id}
              />
            </>
          )}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || user?.email || "Usuário"} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || user?.email || "Usuário"} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate">{profile?.name || user?.email || "Usuário"}</div>
                      <div className={`ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {isPro && <Crown className="h-3 w-3" />}
                        {plan === "pro" ? "Pro" : "Free"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    <div className="text-xs text-muted-foreground">Último acesso: {lastAccess}</div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/conta")}>Minha Conta</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/planos")}>
                {plan === "pro" ? "Planos e Pagamento" : "Upgrade para Pro"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
