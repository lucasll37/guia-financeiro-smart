import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export function useTransactions(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", accountId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, categories(name, type, color)");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId || accountId === undefined,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Lançamento criado",
        description: "Seu lançamento foi criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar lançamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Lançamento atualizado",
        description: "Seu lançamento foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar lançamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Lançamento excluído",
        description: "Seu lançamento foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir lançamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
