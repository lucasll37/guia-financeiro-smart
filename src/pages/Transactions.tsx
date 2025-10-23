import { EmptyState } from "@/components/EmptyState";
import { ArrowLeftRight } from "lucide-react";

export default function Transactions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
        <p className="text-muted-foreground">
          Registre suas receitas e despesas
        </p>
      </div>

      <EmptyState
        icon={ArrowLeftRight}
        title="Nenhum lançamento registrado"
        description="Comece a registrar suas transações financeiras para ter controle total sobre seu dinheiro."
        actionLabel="Novo lançamento"
        onAction={() => console.log("Novo lançamento")}
      />
    </div>
  );
}
