import { 
  LayoutDashboard, 
  Wallet, 
  Tag, 
  ArrowLeftRight, 
  Target, 
  TrendingUp, 
  FileText, 
  Settings,
  Sparkles
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { t } from "@/lib/i18n";

const menuItems = [
  { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
  { title: t("nav.accounts"), url: "/contas", icon: Wallet },
  { title: t("nav.categories"), url: "/categorias", icon: Tag },
  { title: t("nav.transactions"), url: "/lancamentos", icon: ArrowLeftRight },
  { title: t("nav.goals"), url: "/metas", icon: Target, requiredPlan: "plus" as const },
  { title: t("nav.investments"), url: "/investimentos", icon: TrendingUp, requiredPlan: "pro" as const },
  { title: t("nav.reports"), url: "/relatorios", icon: FileText, requiredPlan: "plus" as const },
  { title: t("nav.settings"), url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { subscription } = useSubscription();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.requiredPlan &&
                            subscription?.plan === "free" && (
                              <Badge variant="secondary" className="text-xs">
                                {item.requiredPlan === "plus" ? "Plus" : "Pro"}
                              </Badge>
                            )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Assinatura">
                  <NavLink
                    to="/assinatura"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : ""
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {!isCollapsed && <span>Assinatura</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
