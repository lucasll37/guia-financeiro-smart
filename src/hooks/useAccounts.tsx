import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

export function useAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Account[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: AccountInsert) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Conta criada",
        description: "Sua conta foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: AccountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Conta atualizada",
        description: "Sua conta foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
