import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { Send, Bell } from "lucide-react";

const notificationTypes = [
  { value: "system", label: "🔔 Sistema", description: "Notificações gerais do sistema" },
  { value: "budget_alert", label: "⚠️ Alerta de Orçamento", description: "Avisos sobre orçamentos" },
  { value: "goal", label: "🎯 Meta", description: "Atualizações de metas" },
  { value: "transaction", label: "💰 Transação", description: "Alertas de transações" },
  { value: "invite", label: "👥 Convite", description: "Convites e compartilhamentos" },
];

export function NotificationCreator() {
  const { toast } = useToast();
  const { createNotification } = useNotifications("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notificationType, setNotificationType] = useState<string>("system");
  const [message, setMessage] = useState("");

  const { data: users, isLoading: loadingUsers } = useQuery({
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
    if (!selectedUser) {
      toast({
        title: "Selecione um usuário",
        description: "É necessário selecionar um usuário para enviar a notificação",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Escreva uma mensagem",
        description: "A mensagem da notificação não pode estar vazia",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNotification.mutateAsync({
        user_id: selectedUser,
        type: notificationType as any,
        message: message.trim(),
        metadata: {
          sent_by_admin: true,
          sent_at: new Date().toISOString(),
        },
      });

      toast({
        title: "Notificação enviada!",
        description: "A notificação foi enviada com sucesso para o usuário",
      });

      // Limpar formulário
      setMessage("");
      setSelectedUser("");
      setNotificationType("system");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
        description: error.message || "Ocorreu um erro ao enviar a notificação",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Enviar Notificação Personalizada</CardTitle>
            <CardDescription>
              Envie notificações personalizadas para usuários específicos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-select">Destinatário</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {loadingUsers ? (
                <SelectItem value="loading" disabled>
                  Carregando usuários...
                </SelectItem>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || "Sem nome"} ({user.email})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  Nenhum usuário encontrado
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type-select">Tipo de Notificação</Label>
          <Select value={notificationType} onValueChange={setNotificationType}>
            <SelectTrigger id="type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message-input">Mensagem</Label>
          <Textarea
            id="message-input"
            placeholder="Digite a mensagem da notificação..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {message.length}/500 caracteres
          </p>
        </div>

        <Button
          onClick={handleSendNotification}
          disabled={createNotification.isPending || !selectedUser || !message.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {createNotification.isPending ? "Enviando..." : "Enviar Notificação"}
        </Button>
      </CardContent>
    </Card>
  );
}
