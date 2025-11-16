import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

export function StripeSettings() {
  const queryClient = useQueryClient();
  const [priceId, setPriceId] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings", "stripe_pro_price_id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "stripe_pro_price_id")
        .maybeSingle();

      if (error) throw error;
      
      const value = data?.setting_value as string || "";
      setPriceId(value);
      return value;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newPriceId: string) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: "stripe_pro_price_id",
          setting_value: newPriceId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "setting_key",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings", "stripe_pro_price_id"] });
      toast.success("Price ID do Stripe Pro atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar Price ID:", error);
      toast.error("Erro ao atualizar configuração");
    },
  });

  const handleSave = () => {
    if (!priceId.trim()) {
      toast.error("Price ID não pode estar vazio");
      return;
    }

    if (!priceId.startsWith("price_")) {
      toast.error("Price ID deve começar com 'price_'");
      return;
    }

    updateMutation.mutate(priceId.trim());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Configurações do Stripe</CardTitle>
        </div>
        <CardDescription>
          Configure o Price ID do plano Pro no Stripe. Este ID será usado para criar as sessões de checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stripe-price-id">
            Price ID do Plano Pro
            <span className="text-muted-foreground text-sm ml-2">(Ex: price_1ABC123xyz...)</span>
          </Label>
          <Input
            id="stripe-price-id"
            placeholder="price_1SN39tHHQy81N0cFELbk2209"
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Obtenha este ID no dashboard do Stripe em Produtos → Seu produto Pro → Preços
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full sm:w-auto"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
