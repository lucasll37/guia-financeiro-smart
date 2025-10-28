import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseUserActionLogsParams {
  page: number;
  itemsPerPage: number;
  searchEmail?: string;
  actionFilter?: string;
}

export const useUserActionLogs = ({
  page,
  itemsPerPage,
  searchEmail,
  actionFilter,
}: UseUserActionLogsParams) => {
  return useQuery({
    queryKey: ["user-action-logs", page, itemsPerPage, searchEmail, actionFilter],
    queryFn: async () => {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("user_action_logs")
        .select("*, profiles!user_action_logs_user_id_fkey(email, name)", { count: "exact" });

      // Filtrar por ação se necessário
      if (actionFilter && actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data: logs, error, count } = await query;

      if (error) {
        console.error("Error fetching action logs:", error);
        throw error;
      }

      // Filtrar por email se necessário (client-side porque é um join)
      let filteredLogs = logs || [];
      if (searchEmail) {
        filteredLogs = filteredLogs.filter((log: any) => 
          log.profiles?.email?.toLowerCase().includes(searchEmail.toLowerCase())
        );
      }

      return { logs: filteredLogs, total: count || 0 };
    },
  });
};
