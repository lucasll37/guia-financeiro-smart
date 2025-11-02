import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { FeedbackButton } from "./FeedbackButton";
import { CookieConsent } from "@/components/CookieConsent";
import { GeneralMessageModal } from "@/components/GeneralMessageModal";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COOKIE_CONSENT_KEY = "prospera-cookie-consent";
const GENERAL_MESSAGE_KEY = "prospera-general-message";

interface CookieSettings {
  enabled: boolean;
  message: string;
  version: number | null;
}

interface GeneralMessageSettings {
  enabled: boolean;
  title: string;
  message: string;
  version: number | null;
}

export const DashboardLayout = () => {
  const currentYear = new Date().getFullYear();
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showGeneralModal, setShowGeneralModal] = useState(false);

  // Buscar configurações de cookies
  const { data: cookieSettings } = useQuery({
    queryKey: ["cookie-consent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "cookie_consent_message")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      const settingsData = (data?.setting_value as unknown as CookieSettings) || null;
      return settingsData ? {
        ...settingsData,
        enabled: settingsData.enabled !== undefined ? settingsData.enabled : true
      } : { 
        enabled: true,
        message: "", 
        version: null 
      };
    },
  });

  // Buscar configurações de mensagem geral
  const { data: generalSettings } = useQuery({
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

  // Verificar se cookie modal deve aparecer
  useEffect(() => {
    if (!cookieSettings?.enabled) return;

    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!storedConsent) {
      setShowCookieModal(true);
      return;
    }

    try {
      const { version: storedVersion, dont_show_permanently } = JSON.parse(storedConsent);
      
      // Se usuário marcou "não mostrar novamente", respeitar isso
      // Apenas "Forçar Exibição" (que muda a versão) pode sobrescrever
      if (dont_show_permanently) {
        const currentVersion = cookieSettings?.version;
        // Só mostrar se a versão mudou (admin forçou exibição)
        if (currentVersion && storedVersion !== currentVersion) {
          setShowCookieModal(true);
        }
        return;
      }
      
      // Se não marcou "não mostrar", comportamento padrão (não aparece mais)
      setShowCookieModal(false);
    } catch {
      setShowCookieModal(true);
    }
  }, [cookieSettings]);

  // Verificar se general message modal deve aparecer (após cookie ser dispensado)
  useEffect(() => {
    // Se cookie modal está ativo, esperar ele ser fechado
    if (showCookieModal) return;
    
    // Se cookie modal foi fechado manualmente ou se não precisa aparecer, verificar general
    if (!generalSettings?.enabled || !generalSettings?.message) return;

    const storedMessage = localStorage.getItem(GENERAL_MESSAGE_KEY);
    
    if (!storedMessage) {
      setShowGeneralModal(true);
      return;
    }

    try {
      const { version: storedVersion, dont_show_permanently } = JSON.parse(storedMessage);
      
      // Se usuário marcou "não mostrar novamente", respeitar isso
      // Apenas "Forçar Exibição" (que muda a versão) pode sobrescrever
      if (dont_show_permanently) {
        const currentVersion = generalSettings?.version;
        // Só mostrar se a versão mudou (admin forçou exibição)
        if (currentVersion && storedVersion !== currentVersion) {
          setShowGeneralModal(true);
        }
        return;
      }

      // Se não marcou "não mostrar", comportamento padrão (não aparece mais)
      setShowGeneralModal(false);
    } catch {
      setShowGeneralModal(true);
    }
  }, [generalSettings, showCookieModal]);

  const handleCookieClose = () => {
    setShowCookieModal(false);
  };

  const handleGeneralClose = () => {
    setShowGeneralModal(false);
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t py-3 px-3 sm:py-4 sm:px-4 md:px-6">
            <p className="text-center text-xs sm:text-sm text-muted-foreground">
              © {currentYear} Prospera - Gestão Financeira
            </p>
          </footer>
        </div>
        <FeedbackButton />
        
        <CookieConsent 
          onVisibleChange={setShowCookieModal}
        />
        
        {!showCookieModal && (
          <GeneralMessageModal />
        )}
      </div>
    </SidebarProvider>
  );
};
