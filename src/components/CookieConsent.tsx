import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const COOKIE_CONSENT_KEY = "prospera-cookie-consent";
const DEFAULT_MESSAGE = `Este site utiliza cookies e armazena dados localmente para melhorar sua experiência de uso. 
Ao continuar navegando, você concorda com nossa política de privacidade e com o tratamento 
de dados conforme a LGPD (Lei Geral de Proteção de Dados). Seus dados financeiros são 
armazenados de forma segura e criptografada.`;

interface CookieSettings {
  enabled: boolean;
  message: string;
  version: number | null;
}

interface CookieConsentProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export const CookieConsent = ({ forceShow = false, onClose }: CookieConsentProps = {}) => {
  const [isVisible, setIsVisible] = useState(forceShow);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["cookie-consent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "cookie_consent_message")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      const settingsData = (data?.setting_value as unknown as CookieSettings) || null;
      // Compatibilidade com dados legados: enabled padrão é true se não existir
      return settingsData ? {
        ...settingsData,
        enabled: settingsData.enabled !== undefined ? settingsData.enabled : true
      } : { 
        enabled: true,
        message: DEFAULT_MESSAGE, 
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
    if (!settings?.enabled) {
      return;
    }

    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!storedConsent) {
      setIsVisible(true);
      return;
    }

    // Verificar se a versão mudou
    try {
      const { version: storedVersion } = JSON.parse(storedConsent);
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
    if (!forceShow && dontShowAgain && settings?.version !== undefined) {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ 
          version: settings.version,
          dont_show_permanently: true 
        })
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
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Aviso sobre Cookies e Privacidade
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {settings?.message || DEFAULT_MESSAGE}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="flex-shrink-0"
                  aria-label="Fechar aviso"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <label
                  htmlFor="dont-show"
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
