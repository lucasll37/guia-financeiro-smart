import { useState } from "react";
import { Bell, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { InviteActions } from "./InviteActions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function NotificationPanel({ userId, onOpenPreferences }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead.mutate(id);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
              >
                <Check className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenPreferences}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
          {!notifications || notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notification) => {
              const metadata = notification.metadata as any;
              const isInvitePending = notification.type === "invite" && 
                metadata?.account_id && 
                metadata?.invited_by &&
                !metadata?.status;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-4 ${
                    isInvitePending ? "" : "cursor-pointer"
                  } ${!notification.read ? "bg-accent/50" : ""}`}
                  onClick={(e) => {
                    if (isInvitePending) {
                      e.preventDefault();
                      e.stopPropagation();
                    } else {
                      handleNotificationClick(notification.id, notification.read);
                    }
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    <span className="text-lg">
                      {notificationIcons[notification.type] || "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                      {isInvitePending && (
                        <InviteActions
                          inviteId={metadata.invite_id}
                          accountId={metadata.account_id}
                          invitedBy={metadata.invited_by}
                          onComplete={() => setOpen(false)}
                        />
                      )}
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
