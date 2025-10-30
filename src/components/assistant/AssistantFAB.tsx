import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Sparkles, Lock } from "lucide-react";
import { FinancialAssistant } from "./FinancialAssistant";
import { useAiTutorAccess } from "@/hooks/useAiTutorAccess";
import { useToast } from "@/hooks/use-toast";

export function AssistantFAB() {
  const { hasAccess, requiresPro } = useAiTutorAccess();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    // Remove pulse após primeira interação
    const hasInteracted = localStorage.getItem("assistant-interacted");
    if (hasInteracted) {
      setShowPulse(false);
    }
  }, []);

  const handleOpen = () => {
    if (!hasAccess) {
      toast({
        title: requiresPro ? "Recurso Pro" : "Acesso negado",
        description: requiresPro 
          ? "O Tutor IA está disponível apenas para usuários com plano Pro."
          : "Você não tem permissão para acessar o Tutor IA.",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(true);
    setShowPulse(false);
    localStorage.setItem("assistant-interacted", "true");
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleOpen}
              size="icon"
              className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:shadow-primary/50 transition-all z-50 bg-gradient-to-br from-primary via-primary to-primary/80 hover:scale-110 group animate-fade-in"
            >
              {/* Pulse ring animado */}
              {showPulse && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              )}
              
              {/* Badge "Novo" */}
              {showPulse && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 opacity-75 animate-pulse" />
                  <Sparkles className="relative h-4 w-4 text-white" />
                </span>
              )}
              
              {/* Ícone principal */}
              <MessageSquare className="h-7 w-7 transition-transform group-hover:scale-110" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-primary text-primary-foreground font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Tutor IA Financeiro</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg p-0 flex flex-col animate-slide-in-right"
        >
          <FinancialAssistant />
        </SheetContent>
      </Sheet>
    </>
  );
}