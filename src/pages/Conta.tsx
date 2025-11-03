import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ProfileSection } from "@/components/conta/ProfileSection";
import { SubscriptionSection } from "@/components/conta/SubscriptionSection";
import { DataSection } from "@/components/conta/DataSection";
import { UserPreferences } from "@/components/settings/UserPreferences";
import { AccessibilityChecklist } from "@/components/settings/AccessibilityChecklist";
import { User, CreditCard, Settings, Shield, Database } from "lucide-react";

export default function Conta() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2 bg-muted/50">
          <TabsTrigger 
            value="profile" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all"
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Perfil</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="subscription" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all"
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-xs font-medium">Assinatura</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="data" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all"
          >
            <Database className="h-5 w-5" />
            <span className="text-xs font-medium">Dados</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="preferences" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs font-medium">Preferências</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="accessibility" 
            className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all col-span-2 sm:col-span-1"
          >
            <Shield className="h-5 w-5" />
            <span className="text-xs font-medium">Acessibilidade</span>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-6">
          <TabsContent value="profile" className="m-0">
            <ProfileSection />
          </TabsContent>

          <TabsContent value="subscription" className="m-0">
            <SubscriptionSection />
          </TabsContent>

          <TabsContent value="data" className="m-0">
            <DataSection />
          </TabsContent>

          <TabsContent value="preferences" className="m-0">
            <UserPreferences />
          </TabsContent>

          <TabsContent value="accessibility" className="m-0">
            <AccessibilityChecklist />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}