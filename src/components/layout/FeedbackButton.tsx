import { useState } from "react";
import { MessageSquare, Bug, Lightbulb, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type FeedbackType = "bug" | "suggestion" | null;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (type: "bug" | "suggestion") => {
    setFeedbackType(type);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, descreva o problema ou sugestão",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Aqui você pode enviar para uma tabela no Supabase ou para um serviço externo
      // Por enquanto, vou apenas mostrar um toast de sucesso
      console.log({
        type: feedbackType,
        message,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Feedback enviado!",
        description: feedbackType === "bug" 
          ? "Obrigado por reportar o bug. Nossa equipe irá analisá-lo em breve."
          : "Obrigado pela sugestão! Vamos avaliar sua ideia.",
      });

      setMessage("");
      setIsOpen(false);
      setFeedbackType(null);
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar seu feedback. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform bg-gradient-to-br from-primary to-primary/80"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 bg-background border-border z-[100]"
          >
            <DropdownMenuItem
              onClick={() => handleOpenDialog("bug")}
              className="cursor-pointer gap-2 py-3"
            >
              <Bug className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Reportar Bug</p>
                <p className="text-xs text-muted-foreground">
                  Encontrou um problema?
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOpenDialog("suggestion")}
              className="cursor-pointer gap-2 py-3"
            >
              <Lightbulb className="h-5 w-5 text-chart-3" />
              <div>
                <p className="font-medium">Sugestão</p>
                <p className="text-xs text-muted-foreground">
                  Compartilhe suas ideias
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de feedback */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {feedbackType === "bug" ? (
                <>
                  <Bug className="h-5 w-5 text-destructive" />
                  Reportar Bug
                </>
              ) : (
                <>
                  <Lightbulb className="h-5 w-5 text-chart-3" />
                  Enviar Sugestão
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {feedbackType === "bug"
                ? "Descreva o problema que você encontrou. Inclua detalhes sobre o que você estava fazendo quando o erro ocorreu."
                : "Compartilhe suas ideias para melhorias ou novos recursos. Sua opinião é muito importante!"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">
                {feedbackType === "bug" ? "Descrição do problema" : "Sua sugestão"}
              </Label>
              <Textarea
                id="message"
                placeholder={
                  feedbackType === "bug"
                    ? "Ex: Ao tentar criar uma transação, a página não carrega..."
                    : "Ex: Seria útil ter um gráfico de comparação mensal..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setMessage("");
                setFeedbackType(null);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
