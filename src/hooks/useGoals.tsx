import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];
type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];

export function useGoals(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals", accountId],
    queryFn: async () => {
      let query = supabase.from("goals").select("*");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!accountId || accountId === undefined,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: GoalInsert) => {
      const { data, error } = await supabase
        .from("goals")
        .insert(goal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({
        title: "Meta criada",
        description: "Sua meta foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: GoalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({
        title: "Meta atualizada",
        description: "Sua meta foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({
        title: "Meta excluída",
        description: "Sua meta foi excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    goals,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
