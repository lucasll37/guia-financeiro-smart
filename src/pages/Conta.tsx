import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSection } from "@/components/conta/ProfileSection";
import { SubscriptionSection } from "@/components/conta/SubscriptionSection";
import { DataSection } from "@/components/conta/DataSection";
import { UserPreferences } from "@/components/settings/UserPreferences";
import { AccessibilityChecklist } from "@/components/settings/AccessibilityChecklist";
import { User, CreditCard, Settings, Database, ChevronRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

type Section = "profile" | "subscription" | "data" | "preferences" | "accessibility";

export default function Conta() {
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const { user } = useAuth();
  const { subscription } = useSubscription();

  if (activeSection === "profile") {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveSection(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Voltar para Minha Conta
        </button>
        <ProfileSection />
      </div>
    );
  }

  if (activeSection === "subscription") {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveSection(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Voltar para Minha Conta
        </button>
        <SubscriptionSection />
      </div>
    );
  }

  if (activeSection === "data") {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveSection(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Voltar para Minha Conta
        </button>
        <DataSection />
      </div>
    );
  }

  if (activeSection === "preferences") {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveSection(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Voltar para Minha Conta
        </button>
        <UserPreferences />
      </div>
    );
  }

  if (activeSection === "accessibility") {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setActiveSection(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Voltar para Minha Conta
        </button>
        <AccessibilityChecklist />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Card Perfil */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover-scale group"
          onClick={() => setActiveSection("profile")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit">
                <User className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">Perfil</CardTitle>
            <CardDescription>
              Informações pessoais e dados de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {user?.email && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card Assinatura */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover-scale group"
          onClick={() => setActiveSection("subscription")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit">
                <CreditCard className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">Assinatura</CardTitle>
            <CardDescription>
              Plano atual e gerenciamento de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={subscription?.plan === "free" ? "secondary" : "default"}>
              {subscription?.plan === "free" ? "Plano Gratuito" : 
               subscription?.plan === "plus" ? "Plano Plus" : 
               subscription?.plan === "pro" ? "Plano Pro" : "Plano Básico"}
            </Badge>
          </CardContent>
        </Card>

        {/* Card Dados */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover-scale group"
          onClick={() => setActiveSection("data")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit">
                <Database className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">Dados</CardTitle>
            <CardDescription>
              Importar, exportar e gerenciar seus dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Backup e restauração de informações
            </p>
          </CardContent>
        </Card>

        {/* Card Preferências */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover-scale group"
          onClick={() => setActiveSection("preferences")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit">
                <Settings className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">Preferências</CardTitle>
            <CardDescription>
              Personalize sua experiência no aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notificações, idioma e muito mais
            </p>
          </CardContent>
        </Card>

        {/* Card Acessibilidade */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover-scale group md:col-span-2 lg:col-span-1"
          onClick={() => setActiveSection("accessibility")}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit">
                <Settings className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-xl mt-4">Acessibilidade</CardTitle>
            <CardDescription>
              Recursos para melhorar sua navegação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ajustes de visualização e interação
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}