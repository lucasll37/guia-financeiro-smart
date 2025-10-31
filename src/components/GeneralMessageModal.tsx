import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const GENERAL_MESSAGE_KEY = "prospera-general-message";

interface GeneralMessageSettings {
  enabled: boolean;
  title: string;
  message: string;
  version: number | null;
}

interface GeneralMessageModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export const GeneralMessageModal = ({ forceShow = false, onClose }: GeneralMessageModalProps = {}) => {
  const [isVisible, setIsVisible] = useState(forceShow);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["general-message-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "general_message")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return (data?.setting_value as unknown as GeneralMessageSettings) || { 
        enabled: false, 
        title: "", 
        message: "", 
        version: null 
      };
    },
  });

  useEffect(() => {
    // Se forceShow estiver ativo, não processar lógica de localStorage
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // Não mostrar se não estiver habilitado
    if (!settings?.enabled || !settings?.message) {
      return;
    }

    const storedMessage = localStorage.getItem(GENERAL_MESSAGE_KEY);
    
    if (!storedMessage) {
      setIsVisible(true);
      return;
    }

    // Verificar se a versão mudou
    try {
      const { version: storedVersion } = JSON.parse(storedMessage);
      const currentVersion = settings?.version;

      // Se há uma nova versão, mostrar novamente
      if (currentVersion && storedVersion !== currentVersion) {
        setIsVisible(true);
      }
    } catch {
      // Se houver erro ao parsear, mostrar novamente
      setIsVisible(true);
    }
  }, [settings, forceShow]);

  const handleClose = () => {
    if (!forceShow && dontShowAgain && settings?.version) {
      localStorage.setItem(
        GENERAL_MESSAGE_KEY,
        JSON.stringify({ version: settings.version })
      );
    }
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible || (!forceShow && !settings?.enabled)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl shadow-2xl border-2 animate-in fade-in zoom-in-95 duration-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {settings?.title || "Mensagem Importante"}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {settings?.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="flex-shrink-0"
                  aria-label="Fechar mensagem"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="dont-show-general"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <label
                  htmlFor="dont-show-general"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Não mostrar novamente
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
