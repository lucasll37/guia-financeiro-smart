import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export function useCategories(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", accountId],
    queryFn: async () => {
      let query = supabase.from("categories").select("*");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!accountId || accountId === undefined,
  });

  const createCategory = useMutation({
    mutationFn: async (category: CategoryInsert) => {
      const { data, error } = await supabase
        .from("categories")
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoria criada",
        description: "Sua categoria foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: CategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoria atualizada",
        description: "Sua categoria foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      const isSystemCategory = error.message.includes("row-level security");
      toast({
        title: "Erro ao atualizar categoria",
        description: isSystemCategory 
          ? "Esta categoria foi criada automaticamente e não pode ser editada"
          : error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Categoria excluída",
        description: "Sua categoria foi excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      const isSystemCategory = error.message.includes("row-level security");
      toast({
        title: "Erro ao excluir categoria",
        description: isSystemCategory
          ? "Esta categoria foi criada automaticamente e não pode ser excluída"
          : error.message,
        variant: "destructive",
      });
    },
  });

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
