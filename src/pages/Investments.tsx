import { EmptyState } from "@/components/EmptyState";
import { TrendingUp } from "lucide-react";

export default function Investments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investimentos</h1>
        <p className="text-muted-foreground">
          Acompanhe sua carteira de investimentos
        </p>
      </div>

      <EmptyState
        icon={TrendingUp}
        title="Nenhum investimento cadastrado"
        description="Adicione seus investimentos para acompanhar a rentabilidade da sua carteira."
        actionLabel="Adicionar investimento"
        onAction={() => console.log("Adicionar investimento")}
      />
    </div>
  );
}
