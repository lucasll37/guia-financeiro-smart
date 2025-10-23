import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useLocation } from "react-router-dom";
import { t } from "@/lib/i18n";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useState } from "react";

const routeLabels: Record<string, string> = {
  "/dashboard": t("nav.dashboard"),
  "/contas": t("nav.accounts"),
  "/categorias": t("nav.categories"),
  "/lancamentos": t("nav.transactions"),
  "/metas": t("nav.goals"),
  "/investimentos": t("nav.investments"),
  "/relatorios": t("nav.reports"),
  "/configuracoes": t("nav.settings"),
};

export const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const currentRoute = routeLabels[location.pathname] || "Dashboard";
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4">
        <SidebarTrigger />
        
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentRoute}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("common.search")}
              className="pl-10"
            />
          </div>

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
                <Avatar>
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
