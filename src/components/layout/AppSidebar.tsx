import { 
  LayoutDashboard, 
  Wallet, 
  Tag, 
  ArrowLeftRight, 
  CreditCard,
  CalendarClock,
  BarChart3,
  Target, 
  TrendingUp, 
  FileText,
  ShieldCheck,
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
import { t } from "@/lib/i18n";

const menuItems = [
  { title: t("nav.dashboard"), url: "/app/dashboard", icon: LayoutDashboard },
  { title: t("nav.accounts"), url: "/app/contas", icon: Wallet },
  { title: t("nav.categories"), url: "/app/categorias", icon: Tag },
  { title: t("nav.transactions"), url: "/app/lancamentos", icon: ArrowLeftRight },
  { title: "Cartões", url: "/app/cartoes", icon: CreditCard },
  { title: "Previsões", url: "/app/previsoes", icon: CalendarClock },
  { title: "Análise", url: "/app/analise", icon: BarChart3 },
  { title: t("nav.goals"), url: "/app/metas", icon: Target },
  { title: t("nav.investments"), url: "/app/investimentos", icon: TrendingUp },
  { title: t("nav.reports"), url: "/app/relatorios", icon: FileText },
  { title: "Planos", url: "/app/planos", icon: Sparkles },
  { title: "Admin", url: "/app/admin", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="z-50">
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
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
