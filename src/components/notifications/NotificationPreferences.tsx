import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface Preferences {
  budget_alerts: boolean;
  goal_alerts: boolean;
  variance_alerts: boolean;
  invite_alerts: boolean;
}

export function NotificationPreferences({ open, onOpenChange, userId }: NotificationPreferencesProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Preferences>({
    budget_alerts: true,
    goal_alerts: true,
    variance_alerts: true,
    invite_alerts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open, userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Preferences would be stored in a metadata field or separate table
      // For now, we'll use localStorage as a simple solution
      const stored = localStorage.getItem(`notification_prefs_${userId}`);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error: any) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleToggle = async (key: keyof Preferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    try {
      setLoading(true);
      // Save to localStorage (in production, save to database)
      localStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(newPreferences));
      
      toast({
        title: "Preferências atualizadas",
        description: "Suas preferências de notificação foram salvas",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-alerts">Alertas de Orçamento</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas quando ultrapassar o orçamento de uma categoria
                </p>
              </div>
              <Switch
                id="budget-alerts"
                checked={preferences.budget_alerts}
                onCheckedChange={(checked) => handleToggle("budget_alerts", checked)}
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="goal-alerts">Alertas de Metas</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas sobre metas atrasadas ou próximas do prazo
                </p>
              </div>
              <Switch
                id="goal-alerts"
                checked={preferences.goal_alerts}
                onCheckedChange={(checked) => handleToggle("goal_alerts", checked)}
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="variance-alerts">Alertas de Variação</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas sobre grandes variações em relação ao mês anterior
                </p>
              </div>
              <Switch
                id="variance-alerts"
                checked={preferences.variance_alerts}
                onCheckedChange={(checked) => handleToggle("variance_alerts", checked)}
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="invite-alerts">Convites e Membros</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre convites para contas compartilhadas
                </p>
              </div>
              <Switch
                id="invite-alerts"
                checked={preferences.invite_alerts}
                onCheckedChange={(checked) => handleToggle("invite_alerts", checked)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
