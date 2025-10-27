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
  ShieldCheck
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
  { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
  { title: t("nav.accounts"), url: "/contas", icon: Wallet },
  { title: t("nav.categories"), url: "/categorias", icon: Tag },
  { title: t("nav.transactions"), url: "/lancamentos", icon: ArrowLeftRight },
  { title: "Cartões", url: "/cartoes", icon: CreditCard },
  { title: "Previsões", url: "/previsoes", icon: CalendarClock },
  { title: "Análise", url: "/analise", icon: BarChart3 },
  { title: t("nav.goals"), url: "/metas", icon: Target },
  { title: t("nav.investments"), url: "/investimentos", icon: TrendingUp },
  { title: t("nav.reports"), url: "/relatorios", icon: FileText },
  { title: "Admin", url: "/admin", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
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
