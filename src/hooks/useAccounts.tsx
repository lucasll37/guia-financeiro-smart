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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's own accounts
      const { data: ownAccounts, error: ownError } = await supabase
        .from("accounts")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (ownError) throw ownError;

      // Get accounts shared with user (accepted memberships)
      const { data: memberships, error: membershipsError } = await supabase
        .from("account_members")
        .select("account_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (membershipsError) throw membershipsError;

      const sharedAccountIds = memberships?.map(m => m.account_id) || [];

      // Get shared accounts
      let sharedAccounts: Account[] = [];
      if (sharedAccountIds.length > 0) {
        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .in("id", sharedAccountIds)
          .is("deleted_at", null);

        if (error) throw error;
        sharedAccounts = data || [];
      }

      // Combine and deduplicate
      const allAccounts = [...(ownAccounts || []), ...sharedAccounts];
      const uniqueAccounts = Array.from(
        new Map(allAccounts.map(acc => [acc.id, acc])).values()
      );

      return uniqueAccounts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
      const { error } = await supabase
        .from("accounts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-accounts"] });
      toast({
        title: "Conta excluída",
        description: "Sua conta foi marcada para exclusão. Você pode restaurá-la em até 7 dias.",
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

  const { data: deletedAccounts } = useQuery({
    queryKey: ["deleted-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .not("deleted_at", "is", null)
        .gte("deleted_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as Account[];
    },
  });

  const restoreAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("restore_account", {
        account_id: id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-accounts"] });
      toast({
        title: "Conta restaurada",
        description: "Sua conta foi restaurada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar conta",
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
    deletedAccounts,
    restoreAccount,
  };
}
