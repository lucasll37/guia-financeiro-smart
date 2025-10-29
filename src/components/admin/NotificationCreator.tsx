import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { UserPlus, Check } from "lucide-react";
import { z } from "zod";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const notificationSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  type: z.enum(["budget_alert", "goal", "invite", "system", "transaction"]),
  message: z.string().trim().min(1, "Mensagem obrigatória").max(500, "Mensagem muito longa"),
});

export function NotificationCreator() {
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notificationType, setNotificationType] = useState<"budget_alert" | "goal" | "invite" | "system" | "transaction">("system");
  const [message, setMessage] = useState("");

  // Fetch users matching email search
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-search", emailInput],
    queryFn: async () => {
      if (!emailInput || emailInput.length < 2) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .ilike("email", `%${emailInput}%`)
        .limit(10)
        .order("email");

      if (error) throw error;
      return data;
    },
    enabled: emailInput.length >= 2,
  });

  // Reset user selection when email input changes
  useEffect(() => {
    if (emailInput !== selectedEmail) {
      setSelectedUserId("");
      setSelectedEmail("");
    }
  }, [emailInput, selectedEmail]);

  const handleSendNotification = async () => {
    // Validate form
    const validation = notificationSchema.safeParse({
      email: selectedEmail,
      type: notificationType,
      message: message,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!selectedUserId) {
      toast({
        title: "Usuário não selecionado",
        description: "Selecione um usuário válido da lista",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNotification.mutateAsync({
        user_id: selectedUserId,
        type: notificationType,
        message: message.trim(),
      });

      toast({
        title: "Notificação enviada!",
        description: `Notificação enviada para ${selectedEmail}`,
      });

      // Reset form
      setEmailInput("");
      setSelectedEmail("");
      setSelectedUserId("");
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectUser = (user: { id: string; email: string; name: string | null }) => {
    setSelectedUserId(user.id);
    setSelectedEmail(user.email);
    setEmailInput(user.email);
    setOpen(false);
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
            <Label htmlFor="user-email">Email do Usuário</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between h-10 px-3",
                    !selectedEmail && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">{selectedEmail || "Digite o email do usuário..."}</span>
                  <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[400px] p-0 bg-popover border shadow-md animate-in fade-in-0 zoom-in-95"
                align="start"
              >
                <Command className="rounded-lg border-0">
                  <CommandInput
                    placeholder="Digite o email..."
                    value={emailInput}
                    onValueChange={setEmailInput}
                    className="h-11 border-b"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                      {emailInput.length < 2
                        ? "Digite pelo menos 2 caracteres para buscar"
                        : "Nenhum usuário encontrado"}
                    </CommandEmpty>
                    {users && users.length > 0 && (
                      <CommandGroup className="p-2">
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.email}
                            onSelect={() => handleSelectUser(user)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-md cursor-pointer transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                              selectedEmail === user.email && "bg-accent/50"
                            )}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0 transition-opacity",
                                selectedEmail === user.email
                                  ? "opacity-100 text-primary"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <span className="font-medium text-sm truncate">
                                {user.email}
                              </span>
                              {user.name && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {user.name}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-type">Tipo de Notificação</Label>
            <select
              id="notification-type"
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value as any)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="system">Sistema</option>
              <option value="budget_alert">Alerta de Orçamento</option>
              <option value="goal">Meta</option>
              <option value="transaction">Transação</option>
              <option value="invite">Convite</option>
            </select>
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
          disabled={!selectedUserId || !message.trim() || createNotification.isPending}
          className="w-full"
        >
          {createNotification.isPending ? "Enviando..." : "Enviar Notificação"}
        </Button>
      </CardContent>
    </Card>
  );
}
