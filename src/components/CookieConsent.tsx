import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

const COOKIE_CONSENT_KEY = "prospera-cookie-consent";

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-2xl pointer-events-auto shadow-lg border-2">
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
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Este site utiliza cookies e armazena dados localmente para melhorar sua experiência de uso. 
                    Ao continuar navegando, você concorda com nossa política de privacidade e com o tratamento 
                    de dados conforme a LGPD (Lei Geral de Proteção de Dados). Seus dados financeiros são 
                    armazenados de forma segura e criptografada.
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
