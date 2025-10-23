import { EmptyState } from "@/components/EmptyState";
import { Wallet } from "lucide-react";

export default function Accounts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contas</h1>
        <p className="text-muted-foreground">
          Gerencie suas contas bancárias e carteiras
        </p>
      </div>

      <EmptyState
        icon={Wallet}
        title="Nenhuma conta cadastrada"
        description="Adicione suas contas bancárias, carteiras e cartões de crédito para começar a gerenciar suas finanças."
        actionLabel="Adicionar conta"
        onAction={() => console.log("Adicionar conta")}
      />
    </div>
  );
}
