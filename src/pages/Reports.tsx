import { EmptyState } from "@/components/EmptyState";
import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Analise suas finanças com relatórios detalhados
        </p>
      </div>

      <EmptyState
        icon={FileText}
        title="Nenhum dado para relatório"
        description="Comece a registrar suas transações para gerar relatórios financeiros completos."
      />
    </div>
  );
}
