import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInvestmentCurrentValue(investmentId: string) {
  return useQuery({
    queryKey: ["investment-current-value", investmentId],
    queryFn: async () => {
      // Get the most recent balance_after from monthly returns
      const { data: latestReturn } = await supabase
        .from("investment_monthly_returns")
        .select("balance_after")
        .eq("investment_id", investmentId)
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestReturn) {
        return Number(latestReturn.balance_after);
      }

      // If no returns yet, get the initial balance from the investment
      const { data: investment } = await supabase
        .from("investment_assets")
        .select("balance")
        .eq("id", investmentId)
        .single();

      return investment ? Number(investment.balance) : 0;
    },
    enabled: !!investmentId,
  });
}
