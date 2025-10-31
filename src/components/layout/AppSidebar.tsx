import { 
  LayoutDashboard, 
  Wallet, 
  Target, 
  TrendingUp, 
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import { cn } from "@/lib/utils";

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
  const location = useLocation();
  
  const visibleMenuItems = isAdmin ? [...menuItems, adminMenuItem] : menuItems;

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95"
    >
      <SidebarContent className="gap-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3">
            {!isCollapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="gap-1">
              {visibleMenuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      className={cn(
                        "relative transition-all duration-200 group",
                        isActive && "bg-primary/10 hover:bg-primary/15"
                      )}
                    >
                       <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center rounded-lg overflow-visible text-foreground",
                          isCollapsed ? "justify-center" : "gap-3 px-3 py-2.5",
                          "hover:bg-accent/50 transition-colors",
                          isActive && [
                            "text-primary font-medium",
                            !isCollapsed && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                            !isCollapsed && "before:h-8 before:w-1 before:rounded-r-full before:bg-primary",
                            !isCollapsed && "before:shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                          ]
                        )}
                      >
                        <span className="inline-flex w-5 h-5 items-center justify-center shrink-0 text-foreground">
                          <item.icon 
                            className="h-5 w-5"
                            absoluteStrokeWidth
                            strokeWidth={2}
                          />
                        </span>
                        {!isCollapsed && (
                          <span className="flex-1 truncate text-sm">
                            {item.title}
                          </span>
                        )}
                        {isActive && !isCollapsed && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-3">
        {!isCollapsed ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-sidebar-foreground">
              Versão {version}
            </span>
          </div>
        ) : (
          <div className="flex justify-center rounded-lg bg-sidebar-accent/50 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
