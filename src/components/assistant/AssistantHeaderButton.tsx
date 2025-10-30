import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Sparkles } from "lucide-react";
import { FinancialAssistant } from "./FinancialAssistant";
import { useAiTutorAccess } from "@/hooks/useAiTutorAccess";
import { useToast } from "@/hooks/use-toast";

export function AssistantHeaderButton() {
  const { hasAccess } = useAiTutorAccess();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (!hasAccess) {
      toast({
        title: "Recurso não disponível",
        description: "O Tutor IA não está disponível no seu plano atual.",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(true);
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
              variant="outline"
              size="sm"
              className="gap-2 relative overflow-hidden group hover:shadow-md transition-all border-primary/20 hover:border-primary/50"
            >
              {/* Gradiente de fundo animado */}
              <span className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Ícone com animação */}
              <Bot className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
              
              {/* Texto apenas em desktop */}
              <span className="hidden sm:inline relative">
                Tutor IA
              </span>
              
              {/* Badge de IA */}
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Pergunte ao seu tutor financeiro</span>
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