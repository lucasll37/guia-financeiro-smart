import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AuditLogInput = Omit<Database["public"]["Tables"]["audit_logs"]["Insert"], "user_id">;

export function useAuditLogs() {
  const logAction = useMutation({
    mutationFn: async (log: AuditLogInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("audit_logs").insert({
        ...log,
        user_id: user.id,
      });

      if (error) throw error;
    },
  });

  return { logAction };
}
