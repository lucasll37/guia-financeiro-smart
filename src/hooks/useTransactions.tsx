import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { addMonths, startOfMonth, endOfMonth, format } from "date-fns";

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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      // Atualizar saldo do próximo mês
      if (data?.account_id && data?.date) {
        await updateNextMonthBalance(data.account_id, data.date);
      }
      
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      // Atualizar saldo do próximo mês
      if (data?.account_id && data?.date) {
        await updateNextMonthBalance(data.account_id, data.date);
      }
      
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
      // Buscar a transação antes de deletar para pegar account_id e date
      const { data: transaction } = await supabase
        .from("transactions")
        .select("account_id, date")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return transaction;
    },
    onSuccess: async (transaction) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      // Atualizar saldo do próximo mês
      if (transaction?.account_id && transaction?.date) {
        await updateNextMonthBalance(transaction.account_id, transaction.date);
      }
      
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

  // Função para atualizar saldo do próximo mês
  const updateNextMonthBalance = async (accountId: string, currentDate: string) => {
    try {
      // Calcular período do mês atual
      const date = new Date(currentDate);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      // Buscar todas as transações do mês atual
      const { data: currentMonthTransactions } = await supabase
        .from("transactions")
        .select("*, categories(type)")
        .eq("account_id", accountId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .neq("description", "Saldo Anterior"); // Não incluir saldos anteriores no cálculo

      if (!currentMonthTransactions) return;

      // Calcular saldo do mês
      let balance = 0;
      currentMonthTransactions.forEach((t) => {
        if (t.categories?.type === "receita") {
          balance += Number(t.amount);
        } else if (t.categories?.type === "despesa") {
          balance -= Number(t.amount);
        }
      });

      // Se saldo for zero, não criar lançamento
      if (balance === 0) {
        // Deletar lançamento de saldo anterior se existir
        const nextMonth = addMonths(monthStart, 1);
        await supabase
          .from("transactions")
          .delete()
          .eq("account_id", accountId)
          .eq("description", "Saldo Anterior")
          .eq("date", format(nextMonth, "yyyy-MM-dd"));
        return;
      }

      // Buscar categoria de receita ou despesa para usar no lançamento
      const isIncome = balance > 0;
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("account_id", accountId)
        .eq("type", isIncome ? "receita" : "despesa")
        .limit(1)
        .maybeSingle();

      if (!category) return;

      // Buscar se já existe lançamento de saldo anterior no próximo mês
      const nextMonth = addMonths(monthStart, 1);
      const nextMonthDate = format(nextMonth, "yyyy-MM-dd");

      const { data: existingBalance } = await supabase
        .from("transactions")
        .select("id")
        .eq("account_id", accountId)
        .eq("description", "Saldo Anterior")
        .eq("date", nextMonthDate)
        .maybeSingle();

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      if (existingBalance) {
        // Atualizar lançamento existente
        await supabase
          .from("transactions")
          .update({
            amount: Math.abs(balance),
            category_id: category.id,
          })
          .eq("id", existingBalance.id);
      } else {
        // Criar novo lançamento de saldo anterior
        await supabase
          .from("transactions")
          .insert({
            account_id: accountId,
            category_id: category.id,
            date: nextMonthDate,
            amount: Math.abs(balance),
            description: "Saldo Anterior",
            is_recurring: false,
            created_by: userData.user.id,
          });
      }
    } catch (error) {
      console.error("Erro ao atualizar saldo do próximo mês:", error);
    }
  };

  return {
    transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
