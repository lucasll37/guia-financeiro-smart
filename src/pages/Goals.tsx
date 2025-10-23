import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";

export default function Goals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
        <p className="text-muted-foreground">
          Defina e acompanhe suas metas financeiras
        </p>
      </div>

      <EmptyState
        icon={Target}
        title="Nenhuma meta definida"
        description="Crie metas financeiras para alcançar seus objetivos e sonhos."
        actionLabel="Criar meta"
        onAction={() => console.log("Criar meta")}
      />
    </div>
  );
}
