import { useState } from "react";
import { Bell, Check, Settings, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { InviteActions } from "./InviteActions";
import { formatDistanceToNow, isToday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  userId: string;
  onOpenPreferences: () => void;
}

const notificationIcons: Record<string, string> = {
  invite: "👥",
  transaction: "💰",
  goal: "🎯",
  budget_alert: "⚠️",
  system: "🔔",
};

const notificationColors: Record<string, string> = {
  invite: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  transaction: "bg-green-500/10 text-green-500 border-green-500/20",
  goal: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  budget_alert: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  system: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function NotificationPanel({ userId, onOpenPreferences }: NotificationPanelProps) {
  const { 
    notifications, 
    unreadCount, 
    readCount,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead.mutate(id);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const groupedNotifications = notifications?.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    let group = "Mais antigas";
    
    if (isToday(date)) {
      group = "Hoje";
    } else if (isThisWeek(date)) {
      group = "Esta semana";
    }
    
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(notification);
    return groups;
  }, {} as Record<string, typeof notifications>);

  const groupOrder = ["Hoje", "Esta semana", "Mais antigas"];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-base">Notificações</h3>
            {notifications && notifications.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {notifications.length} {notifications.length === 1 ? "notificação" : "notificações"}
                {unreadCount > 0 && ` (${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"})`}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                className="h-8 text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAllRead.mutate()}
                className="h-8 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Limpar lidas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenPreferences}
              className="h-8 w-8"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[28rem]">
          {!notifications || notifications.length === 0 ? (
            <div className="py-16 text-center animate-fade-in">
              <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está em dia!
              </p>
            </div>
          ) : (
            <div className="p-2">
              {groupOrder.map((groupName) => {
                const groupNotifications = groupedNotifications?.[groupName];
                if (!groupNotifications || groupNotifications.length === 0) return null;

                return (
                  <div key={groupName} className="mb-4">
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      {groupName}
                    </DropdownMenuLabel>
                    <div className="space-y-1">
                      {groupNotifications.map((notification) => {
                        const metadata = notification.metadata as any;
                        const isInviteCancelled = metadata?.invite_cancelled === true;
                        const isInvitePending = notification.type === "invite" && 
                          (metadata?.account_id || metadata?.investment_id) && 
                          metadata?.invited_by &&
                          !metadata?.status &&
                          !isInviteCancelled;

                        return (
                          <DropdownMenuItem
                            key={notification.id}
                            className={cn(
                              "group flex flex-col items-start gap-2 p-3 rounded-lg transition-all duration-200 animate-fade-in",
                              isInvitePending ? "" : "cursor-pointer",
                              !notification.read 
                                ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary" 
                                : "hover:bg-accent"
                            )}
                            onClick={(e) => {
                              if (isInvitePending) {
                                e.preventDefault();
                                e.stopPropagation();
                              } else {
                                handleNotificationClick(notification.id, notification.read);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "rounded-full p-1.5 border",
                                  notificationColors[notification.type] || notificationColors.system
                                )}
                              >
                                <span className="text-base leading-none">
                                  {notificationIcons[notification.type] || "🔔"}
                                </span>
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium leading-snug">
                                      {notification.message}
                                    </p>
                                    {isInviteCancelled && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        Este convite foi cancelado
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity flex-shrink-0"
                                    onClick={(e) => handleDelete(e, notification.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </p>
                                  {!notification.read && (
                                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                      Não lida
                                    </Badge>
                                  )}
                                  {isInviteCancelled && (
                                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                                      Cancelado
                                    </Badge>
                                  )}
                                </div>
                                {isInvitePending && (
                                  <InviteActions
                                    inviteId={metadata.invite_id}
                                    accountId={metadata.account_id}
                                    investmentId={metadata.investment_id}
                                    invitedBy={metadata.invited_by}
                                    onComplete={() => setOpen(false)}
                                  />
                                )}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
