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

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Salvar feedback no banco de dados
      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          type: feedbackType,
          message: message.trim(),
        });

      if (error) throw error;

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
      console.error("Erro ao enviar feedback:", error);
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
      <div className="fixed bottom-4 right-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full shadow-md hover:shadow-lg opacity-60 hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-sm"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={12}
            className="w-64 p-2 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 border-border/50 backdrop-blur-sm"
          >
            <DropdownMenuItem
              onClick={() => handleOpenDialog("bug")}
              className="cursor-pointer gap-3 py-4 px-3 rounded-lg transition-all group hover:scale-[1.02] hover:bg-red-500/10 dark:hover:bg-red-400/10 focus:bg-red-500/10 dark:focus:bg-red-400/10"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 flex items-center justify-center group-hover:from-red-500/30 group-hover:to-red-600/30 dark:group-hover:from-red-400/30 dark:group-hover:to-red-500/30 transition-all shadow-sm">
                <Bug className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Reportar Bug</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Encontrou um problema?
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOpenDialog("suggestion")}
              className="cursor-pointer gap-3 py-4 px-3 rounded-lg transition-all group hover:scale-[1.02] hover:bg-amber-500/10 dark:hover:bg-amber-400/10 focus:bg-amber-500/10 dark:focus:bg-amber-400/10"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 dark:from-amber-400/20 dark:to-yellow-400/20 flex items-center justify-center group-hover:from-amber-500/30 group-hover:to-yellow-500/30 dark:group-hover:from-amber-400/30 dark:group-hover:to-yellow-400/30 transition-all shadow-sm">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Sugestão</p>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/20 dark:to-red-500/20 flex items-center justify-center">
                    <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  Reportar Bug
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 dark:from-amber-400/20 dark:to-yellow-400/20 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
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
