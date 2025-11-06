import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAiTutorAccess } from "@/hooks/useAiTutorAccess";
import { AiTutorPopup } from "./AiTutorPopup";

export function AiTutorButton() {
  const { aiTutorEnabled } = useAppSettings();
  const { hasAccess } = useAiTutorAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (aiTutorEnabled && hasAccess) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
      setIsOpen(false);
    }
  }, [aiTutorEnabled, hasAccess]);

  if (!shouldRender) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-40 animate-fade-in"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <AiTutorPopup 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
