import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/conta/ProfileSection";
import { SubscriptionSection } from "@/components/conta/SubscriptionSection";
import { DataSection } from "@/components/conta/DataSection";
import { UserPreferences } from "@/components/settings/UserPreferences";
import { AccessibilityChecklist } from "@/components/settings/AccessibilityChecklist";
import { User, CreditCard, Settings, Shield, Database } from "lucide-react";
export default function Conta() {
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta Prospera!</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Assinatura</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Preferências</span>
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Acessibilidade</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionSection />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <DataSection />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <UserPreferences />
        </TabsContent>

        <TabsContent value="accessibility" className="mt-6">
          <AccessibilityChecklist />
        </TabsContent>
      </Tabs>
    </div>;
}