import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId!)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notificações marcadas como lidas",
      });
    },
  });

  const createNotification = useMutation({
    mutationFn: async (notification: {
      user_id: string;
      type: "budget_alert" | "goal" | "invite" | "system" | "transaction";
      message: string;
      metadata?: any;
    }) => {
      // Check for existing similar notifications in the last 24h to avoid duplicates
      const { data: recent } = await supabase
        .from("notifications")
        .select("type, metadata")
        .eq("user_id", notification.user_id)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Check if a similar notification already exists
      const isDuplicate = recent?.some(
        (r) =>
          r.type === notification.type &&
          JSON.stringify(r.metadata) === JSON.stringify(notification.metadata)
      );

      // Only insert if not duplicate
      if (!isDuplicate) {
        const { error } = await supabase.from("notifications").insert({
          ...notification,
          metadata: notification.metadata as any,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId!)
        .eq("read", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notificações lidas removidas",
        description: "Todas as notificações lidas foram excluídas com sucesso",
      });
    },
  });

  const readCount = notifications?.filter((n) => n.read).length || 0;

  return {
    notifications,
    isLoading,
    unreadCount,
    readCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    deleteAllRead,
  };
}
