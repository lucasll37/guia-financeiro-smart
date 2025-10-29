import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NotificationCreator() {
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notificationType, setNotificationType] = useState<"budget_alert" | "goal" | "invite" | "system" | "transaction">("system");
  const [message, setMessage] = useState("");

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleSendNotification = async () => {
    if (!selectedUser || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um usuário e escreva uma mensagem",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNotification.mutateAsync({
        user_id: selectedUser,
        type: notificationType,
        message: message.trim(),
      });

      toast({
        title: "Notificação enviada!",
        description: "O usuário receberá a notificação no painel dele",
      });

      // Reset form
      setSelectedUser("");
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Notificação Individual
        </CardTitle>
        <CardDescription>
          Envie uma notificação personalizada para um usuário específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Usuário</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Carregando usuários...
                  </SelectItem>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email || "Sem nome"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum usuário encontrado
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-type">Tipo de Notificação</Label>
            <Select
              value={notificationType}
              onValueChange={(value: any) => setNotificationType(value)}
            >
              <SelectTrigger id="notification-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Sistema</SelectItem>
                <SelectItem value="budget_alert">Alerta de Orçamento</SelectItem>
                <SelectItem value="goal">Meta</SelectItem>
                <SelectItem value="transaction">Transação</SelectItem>
                <SelectItem value="invite">Convite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-message-individual">Mensagem</Label>
          <Textarea
            id="notification-message-individual"
            placeholder="Digite a mensagem da notificação..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        <Button
          onClick={handleSendNotification}
          disabled={!selectedUser || !message.trim() || createNotification.isPending}
          className="w-full"
        >
          {createNotification.isPending ? "Enviando..." : "Enviar Notificação"}
        </Button>
      </CardContent>
    </Card>
  );
}
