import { EmptyState } from "@/components/EmptyState";
import { Tag } from "lucide-react";

export default function Categories() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
        <p className="text-muted-foreground">
          Organize seus lançamentos em categorias
        </p>
      </div>

      <EmptyState
        icon={Tag}
        title="Nenhuma categoria cadastrada"
        description="Crie categorias para organizar suas receitas e despesas de forma eficiente."
        actionLabel="Criar categoria"
        onAction={() => console.log("Criar categoria")}
      />
    </div>
  );
}
