import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AccessibilityItem {
  id: string;
  title: string;
  description: string;
  status: "implemented" | "partial" | "pending";
}

const accessibilityItems: AccessibilityItem[] = [
  {
    id: "landmarks",
    title: "Landmarks Semânticas",
    description: "Uso de tags HTML5 semânticas (header, main, nav, aside, footer)",
    status: "implemented",
  },
  {
    id: "labels",
    title: "Labels e ARIA",
    description: "Todos os campos de formulário possuem labels descritivos",
    status: "implemented",
  },
  {
    id: "contrast",
    title: "Contraste de Cores",
    description: "Razão de contraste mínima de 4.5:1 (WCAG AA)",
    status: "implemented",
  },
  {
    id: "keyboard",
    title: "Navegação por Teclado",
    description: "Todos os elementos interativos são acessíveis via teclado",
    status: "implemented",
  },
  {
    id: "focus",
    title: "Indicadores de Foco",
    description: "Elementos focados têm indicação visual clara",
    status: "implemented",
  },
  {
    id: "alt-text",
    title: "Textos Alternativos",
    description: "Imagens e ícones possuem descrições alternativas",
    status: "implemented",
  },
  {
    id: "responsive",
    title: "Design Responsivo",
    description: "Interface adaptável para diferentes tamanhos de tela",
    status: "implemented",
  },
  {
    id: "error-handling",
    title: "Tratamento de Erros",
    description: "Mensagens de erro claras e descritivas",
    status: "implemented",
  },
];

export function AccessibilityChecklist() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "implemented":
        return (
          <Badge variant="default" className="bg-accent">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Implementado
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Parcial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            Pendente
          </Badge>
        );
    }
  };

  const implementedCount = accessibilityItems.filter(
    (item) => item.status === "implemented"
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acessibilidade (WCAG 2.1)</CardTitle>
        <CardDescription>
          {implementedCount} de {accessibilityItems.length} critérios implementados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accessibilityItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border"
            >
              <div className="flex-1">
                <h4 className="font-medium mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              {getStatusBadge(item.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
