import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type CreditCardInsert = Omit<Database["public"]["Tables"]["credit_cards"]["Insert"], 'created_by'>;
type CreditCardUpdate = Database["public"]["Tables"]["credit_cards"]["Update"];

export function useCreditCards(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: creditCards, isLoading } = useQuery({
    queryKey: ["credit_cards", accountId],
    queryFn: async () => {
      let query = supabase
        .from("credit_cards")
        .select("*");

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query.order("name", { ascending: true });

      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!accountId || accountId === undefined,
  });

  const createCreditCard = useMutation({
    mutationFn: async (creditCard: CreditCardInsert) => {
      const { data, error } = await supabase
        .from("credit_cards")
        .insert({
          ...creditCard,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast({
        title: "Cartão criado",
        description: "Seu cartão foi criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: async ({ id, ...updates }: CreditCardUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("credit_cards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast({
        title: "Cartão atualizado",
        description: "Seu cartão foi atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast({
        title: "Cartão excluído",
        description: "Seu cartão foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    creditCards,
    isLoading,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
  };
}
