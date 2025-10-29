import { 
  LayoutDashboard, 
  Wallet, 
  Target, 
  TrendingUp, 
  ShieldCheck
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { t } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAppSettings } from "@/hooks/useAppSettings";

const menuItems = [
  { title: t("nav.dashboard"), url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Contas", url: "/app/contas", icon: Wallet },
  { title: t("nav.goals"), url: "/app/metas", icon: Target },
  { title: t("nav.investments"), url: "/app/investimentos", icon: TrendingUp },
];

const adminMenuItem = { title: "Admin", url: "/app/admin", icon: ShieldCheck };

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { data: isAdmin } = useIsAdmin();
  const { version } = useAppSettings();
  
  const visibleMenuItems = isAdmin ? [...menuItems, adminMenuItem] : menuItems;

  return (
    <Sidebar collapsible="icon" className="z-50">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
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
      
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {!isCollapsed && <span>v{version}</span>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
