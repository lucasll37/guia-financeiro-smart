import { User, Crown, Eye, EyeOff, Shield, Wallet } from "lucide-react";
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
import { AssistantHeaderButton } from "@/components/assistant/AssistantHeaderButton";
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
import { useIsAdmin } from "@/hooks/useIsAdmin";

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
  const currentRoute = routeLabels[location.pathname] || "Dashboard";
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { isMasked, toggleMask } = useMaskValues();
  const { data: isAdmin } = useIsAdmin();

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
      <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-2 md:px-4">
        <SidebarTrigger className="shrink-0" />
        
        {/* Logo e Slogan - Oculto em telas pequenas */}
        <div className="hidden min-[500px]:flex absolute left-1/2 -translate-x-1/2 flex-col items-center leading-none pointer-events-none">
          <div className="flex items-center gap-1 md:gap-1.5">
            <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <span className="font-display text-xl md:text-3xl font-bold text-foreground">
              Prospera!
            </span>
          </div>
          <span className="text-xs md:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
            Gestor Financeiro
          </span>
        </div>
        
        <Breadcrumb className="hidden lg:flex">
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
          <Button
            variant={isMasked ? "destructive" : "ghost"}
            size="icon"
            onClick={toggleMask}
            title={isMasked ? "Mostrar valores" : "Ocultar valores"}
            aria-pressed={isMasked}
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
          >
            {isMasked ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
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

          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <AssistantHeaderButton />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || user?.email || "Usuário"} />
                  <AvatarFallback>
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80">
              <DropdownMenuLabel>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || user?.email || "Usuário"} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">{profile?.name || user?.email || "Usuário"}</div>
                        {isAdmin && (
                          <div className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Shield className="h-3 w-3" />
                            Admin
                          </div>
                        )}
                      </div>
                      <div className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
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
              <DropdownMenuItem onClick={() => navigate("/app/conta")}>Minha Conta Prospera!</DropdownMenuItem>
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
