import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, Sparkles } from "lucide-react";
import { useFinancialAssistant, Message } from "@/hooks/useFinancialAssistant";
import { useToast } from "@/hooks/use-toast";

const quickReplies = [
  "💰 Quanto gastei este mês?",
  "📊 Qual minha maior categoria de gasto?",
  "🎯 Como estão minhas metas?",
  "💳 Qual o saldo das minhas contas?",
  "📈 Me dê insights sobre meus gastos",
  "❓ Como adicionar uma transação?",
];

export function FinancialAssistant() {
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage, clearMessages } = useFinancialAssistant();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error,
      });
    }
  }, [error, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleQuickReply = async (reply: string) => {
    await sendMessage(reply);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Assistente Financeiro IA</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearMessages}
          disabled={messages.length === 0}
          title="Limpar conversa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground space-y-4 py-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="relative">
                <Sparkles className="h-16 w-16 text-primary/50 animate-pulse" />
                <div className="absolute inset-0 h-16 w-16 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Olá! Sou seu assistente financeiro 👋
              </h3>
              <p className="text-sm text-muted-foreground">
                Estou aqui para ajudar você a ter controle total das suas finanças
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-lg">📚</span>
                  <div className="text-left">
                    <div className="font-medium">Tutoriais</div>
                    <div className="text-xs text-muted-foreground">Como usar o app</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-lg">💡</span>
                  <div className="text-left">
                    <div className="font-medium">Insights</div>
                    <div className="text-xs text-muted-foreground">Análises personalizadas</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-lg">📊</span>
                  <div className="text-left">
                    <div className="font-medium">Análises</div>
                    <div className="text-xs text-muted-foreground">Gastos e receitas</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-lg">🎯</span>
                  <div className="text-left">
                    <div className="font-medium">Metas</div>
                    <div className="text-xs text-muted-foreground">Acompanhamento</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Pensando...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Experimente perguntar:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickReplies.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                disabled={isLoading}
                className="text-xs justify-start h-auto py-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
            : "bg-muted border border-border"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 rounded-sm" />
        )}
        <p className="text-xs opacity-70 mt-1.5">
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}