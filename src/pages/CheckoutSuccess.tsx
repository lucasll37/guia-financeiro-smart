import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const isMock = searchParams.get("mock");

  useEffect(() => {
    // Invalidate subscription query to fetch updated data
    // This will be handled automatically by React Query when navigating
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-accent/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl">Assinatura Confirmada!</CardTitle>
          <CardDescription>
            {isMock
              ? "Modo demonstração: sua assinatura foi simulada com sucesso"
              : "Sua assinatura foi criada com sucesso"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">O que acontece agora?</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Você tem 14 dias de teste grátis</li>
              <li>Não será cobrado durante o período de teste</li>
              <li>Todos os recursos premium estão disponíveis</li>
              <li>Você pode cancelar a qualquer momento</li>
            </ul>
          </div>

          {sessionId && !isMock && (
            <p className="text-xs text-muted-foreground text-center">
              ID da sessão: {sessionId}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/dashboard")}
              className="flex-1"
            >
              Ir para Dashboard
            </Button>
            <Button
              onClick={() => navigate("/assinatura")}
              variant="outline"
              className="flex-1"
            >
              Ver Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
